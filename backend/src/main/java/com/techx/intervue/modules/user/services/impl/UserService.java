package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.user.entities.SocialAccount;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.exceptions.PasswordAlreadySetException;
import com.techx.intervue.modules.user.exceptions.RoleMismatchException;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.ChangePasswordRequest;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.SetPasswordRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface.PendingLogin;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.RefreshResult;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.services.impl.BaseService;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@AllArgsConstructor
@Slf4j
public class UserService extends BaseService implements UserServiceInterface {

    private final UserSessionCache userSessionCache;
    private final UserRepository userRepository;
    private final SocialAccountRepository socialAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final BlacklistServiceInterface blacklistService;
    private final AuthConfig authConfig;
    private final JobQueueInterface jobQueue;
    private final MfaServiceInterface mfaService;

    /**
     * FR-006: the access token goes into the Redis blacklist until it expires (JwtAuthFilter blocks
     * by jti), the refresh token in the cookie is revoked in the DB so a new access token can no
     * longer be obtained.
     */
    @Override
    @Transactional
    public void logout(Long userId, String accessToken, String refreshToken) {
        Map<String, Object> revoke = jwtService.extractRevoke(accessToken);
        blacklistService.revoke((String) revoke.get("jti"), (Instant) revoke.get("expiresAt"));

        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenService.revokeToken(refreshToken, userId);
        }
    }

    @Override
    @Transactional
    public AuthResult registerCustomer(CustomerRegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = request.phone().trim();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateAccountException("email", "This email is already registered.");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new DuplicateAccountException(
                    "phone", "This phone number is already registered.");
        }
        User user =
                userRepository.save(
                        User.builder()
                                .fullName(request.fullName().trim())
                                .email(email)
                                .phone(phone)
                                .address(request.address().trim())
                                .passwordHash(passwordEncoder.encode(request.password()))
                                .role(RoleType.CUSTOMER)
                                .build());
        return issueTokens(user);
    }

    /**
     * FR-003: a wrong email or a wrong password returns the same message, so it does not reveal
     * which emails are registered.
     */
    @Override
    @Transactional
    public AuthResult authenticate(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user =
                userRepository
                        .findByEmail(email)
                        // An account created from Google has no password
                        .filter(
                                u ->
                                        u.getPasswordHash() != null
                                                && passwordEncoder.matches(
                                                        request.password(), u.getPasswordHash()))
                        .orElseThrow(
                                () ->
                                        new BadCredentialsException(
                                                "Email or password is incorrect."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        // Check before issuing a token: do not hand out a refresh cookie to an account with the
        // wrong role
        if (request.requiredRole() != null && user.getRole() != request.requiredRole()) {
            throw new RoleMismatchException();
        }
        return issueTokensOrChallenge(user, !Boolean.FALSE.equals(request.rememberMe()));
    }

    /**
     * FR-008: step 2 after entering a correct TOTP code / recovery code. Re-check the account state
     * because the admin may have been locked during the 5 minutes waiting for the code.
     */
    @Override
    @Transactional
    public AuthResult completeMfaLogin(String mfaToken, String code, String recoveryCode) {
        PendingLogin pending = mfaService.verifyChallenge(mfaToken, code, recoveryCode);
        User user =
                userRepository
                        .findById(pending.userId())
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        return issueTokens(user, pending.rememberMe());
    }

    /**
     * FR-003: exchange the refresh token (cookie) for a new access token, the refresh token is
     * rotated. Do not wrap in @Transactional here: rotateToken has its own transaction, wrapping it
     * again would make the exception roll back the token revocation done when reuse of a token is
     * detected.
     */
    @Override
    public AuthResult refresh(String rawRefreshToken) {
        RefreshResult rotated = refreshTokenService.rotateToken(rawRefreshToken);
        User user =
                userRepository
                        .findById(rotated.userId())
                        .orElseThrow(
                                () -> new BadCredentialsException("Refresh token is not valid."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        return buildAuthResult(user, rotated.newRefreshToken(), rotated.rememberMe());
    }

    /**
     * Google sign-in after the backend has verified with the provider itself. Look up by (provider,
     * provider_user_id); the first time attach to the user with the same email (only when the email
     * is verified) or create a new customer with no password / phone number.
     */
    @Override
    @Transactional
    public AuthResult loginWithSocial(SocialProfile profile) {
        User user =
                socialAccountRepository
                        .findByProviderAndProviderUserId(
                                profile.provider(), profile.providerUserId())
                        .map(
                                account ->
                                        userRepository
                                                .findById(account.getUserId())
                                                .orElseThrow(
                                                        () ->
                                                                new BadCredentialsException(
                                                                        "Account not found.")))
                        .orElseGet(() -> linkOrCreateUser(profile));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        // FR-008: Google sign-in must not skip step 2
        return issueTokensOrChallenge(user, true);
    }

    private User linkOrCreateUser(SocialProfile profile) {
        if (!StringUtils.hasText(profile.email()) || !profile.emailVerified()) {
            throw new BadCredentialsException(
                    "Your social account has no verified email. Please use another sign-in method.");
        }
        String email = profile.email().trim().toLowerCase(Locale.ROOT);
        User user =
                userRepository
                        .findByEmail(email)
                        .map(existing -> claimByVerifiedEmail(existing, profile))
                        .orElseGet(
                                () ->
                                        userRepository.save(
                                                User.builder()
                                                        .fullName(displayName(profile, email))
                                                        .email(email)
                                                        .image(fitsColumn(profile.pictureUrl()))
                                                        .role(RoleType.CUSTOMER)
                                                        .build()));
        socialAccountRepository.save(
                SocialAccount.builder()
                        .userId(user.getId())
                        .provider(profile.provider())
                        .providerUserId(profile.providerUserId())
                        .email(email)
                        .build());
        return user;
    }

    /**
     * Attach Google to an existing account with the same email. Signing up by email does not verify
     * the email, so the existing password may have been set beforehand by someone else (account
     * pre-hijacking). The provider verified the owner of the email → delete that password, revoke
     * every refresh token and session; the real owner sets a password again at the set-password
     * step (hasPassword = false).
     */
    private User claimByVerifiedEmail(User user, SocialProfile profile) {
        // This email is already attached to another account with the same provider
        if (socialAccountRepository.existsByUserIdAndProvider(user.getId(), profile.provider())) {
            throw new DuplicateAccountException(
                    "email",
                    "This email is already linked to another account from the same provider.");
        }
        if (user.getPasswordHash() != null) {
            user.setPasswordHash(null);
            userRepository.save(user);
            refreshTokenService.revokeAllTokens(user.getId());
            // Run immediately (do not wait for commit): the real owner's new session is written in
            // issueTokens afterwards
            userSessionCache.revokeAll(user.getId());
        }
        return user;
    }

    private static String displayName(SocialProfile profile, String email) {
        String name =
                StringUtils.hasText(profile.name())
                        ? profile.name().trim()
                        : email.substring(0, email.indexOf('@'));
        return name.length() > 100 ? name.substring(0, 100) : name;
    }

    /** users.image is VARCHAR(255); a longer image URL is skipped. */
    private static String fitsColumn(String url) {
        return url != null && url.length() <= 255 ? url : null;
    }

    @Override
    public UserResource getProfile(Long userId) {
        return toResource(findActiveUser(userId));
    }

    /**
     * Only your own account can be edited (userId comes from the access token, not accepted from
     * the request). The email is unchanged. A phone number that duplicates another account → 409;
     * if two requests race past the check, the DB's UNIQUE blocks (AuthExceptionHandler returns
     * 409).
     */
    @Override
    @Transactional
    public UserResource updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findActiveUser(userId);
        String phone = request.phone().trim();
        if (userRepository.existsByPhoneAndIdNot(phone, userId)) {
            throw new DuplicateAccountException(
                    "phone", "This phone number is already registered.");
        }
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        user.setAddress(request.address().trim());
        return toResource(userRepository.saveAndFlush(user));
    }

    private User findActiveUser(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        return user;
    }

    /**
     * FR-008: an admin with 2FA on → only return the pending token; otherwise issue the session as
     * before.
     */
    private AuthResult issueTokensOrChallenge(User user, boolean rememberMe) {
        if (user.getRole() == RoleType.ADMIN && mfaService.isEnabled(user.getId())) {
            return AuthResult.mfaPending(
                    toResource(user),
                    rememberMe,
                    mfaService.startChallenge(user.getId(), rememberMe));
        }
        return issueTokens(user, rememberMe);
    }

    private AuthResult issueTokens(User user) {
        return issueTokens(user, true);
    }

    private AuthResult issueTokens(User user, boolean rememberMe) {
        IssuedToken refreshToken = refreshTokenService.issueRefreshToken(user.getId(), rememberMe);
        return buildAuthResult(user, refreshToken.rawToken(), rememberMe);
    }

    private AuthResult buildAuthResult(User user, String rawRefreshToken, boolean rememberMe) {
        String accessToken = jwtService.generateToken(user.getId());

        Duration ttl = Duration.ofMillis(authConfig.getExpirationTime());
        userSessionCache.set(user.getId(), user.getEmail(), Set.of(user.getRole()), ttl);

        return new AuthResult(accessToken, rawRefreshToken, toResource(user), rememberMe);
    }

    /** Shared with AvatarService. */
    static UserResource toResource(User user) {
        return UserResource.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .hasPassword(user.getPasswordHash() != null)
                .avatarUrl(user.getImage())
                .build();
    }

    /**
     * Change password: the current password must be right. If wrong, 400 on the currentPassword
     * field (not 401 because the FE treats 401 as session ended and refreshes by itself). After the
     * change sign out of every device: revoke every refresh token, after commit revokeAll the Redis
     * sessions (JwtAuthFilter rejects every access token issued earlier) and send a notification
     * email.
     */
    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }
        User user = findActiveUser(userId);
        if (user.getPasswordHash() == null) {
            throw new InvalidFieldException(
                    "currentPassword", "Your account has no password yet. Set one first.");
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new InvalidFieldException("currentPassword", "Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new InvalidFieldException(
                    "newPassword", "Use a password different from the current one.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        refreshTokenService.revokeAllTokens(userId);
        String email = user.getEmail();
        // If the commit fails the password did not change: do not kick out the session, do not send
        // the email
        TransactionHelper.afterCommit(
                () -> {
                    userSessionCache.revokeAll(userId);
                    jobQueue.enqueue(
                            PasswordResetService.JOB_NOTIFY_CHANGED, Map.of("email", email));
                });
    }

    /**
     * Set a password for the first time for an account created through Google. Only when there is
     * no password yet — if there is one, use change / forgot password (409). userId comes from the
     * access token (R-06). The current session is kept.
     */
    @Override
    @Transactional
    public void setPassword(Long userId, SetPasswordRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Your account has been locked. Please contact an administrator.");
        }
        if (user.getPasswordHash() != null) {
            throw new PasswordAlreadySetException();
        }
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
    }
}
