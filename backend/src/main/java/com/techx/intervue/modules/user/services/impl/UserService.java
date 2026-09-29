package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.geo.enums.AddressPolicy;
import com.techx.intervue.modules.geo.resources.AddressPartsResource;
import com.techx.intervue.modules.geo.services.impl.ResolvedAddress;
import com.techx.intervue.modules.geo.services.interfaces.AddressServiceInterface;
import com.techx.intervue.modules.user.entities.SocialAccount;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
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
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.resources.SignupStartedResource;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.resources.VerifiedSignup;
import com.techx.intervue.modules.user.services.interfaces.EmailVerificationServiceInterface;
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
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
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
    private final AddressServiceInterface addressService;
    private final EmailVerificationServiceInterface emailVerification;

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
    public SignupStartedResource registerCustomer(
            CustomerRegisterRequest request, String clientIp) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }
        String email = EmailVerificationService.normalizeEmail(request.email());
        String phone = request.phone().trim();
        throwIfTaken(email, phone);
        ResolvedAddress address =
                addressService.resolve(request.addressParts(), AddressPolicy.ACCOUNT);
        if (StringUtils.hasText(request.website())) {
            log.info("Sign-up honeypot filled in, request dropped");
            return emailVerification.decoy(email);
        }
        PendingSignup pending =
                new PendingSignup(
                        request.fullName().trim(),
                        email,
                        phone,
                        address.formatted(),
                        address.columns(),
                        passwordEncoder.encode(request.password()),
                        EmailVerificationService.normalizeLanguage(request.language()),
                        null);
        return emailVerification.start(pending, request.signupToken(), clientIp);
    }

    @Override
    @Transactional
    public AuthResult completeSignup(String email, String code, String signupToken) {
        VerifiedSignup verified = emailVerification.verify(email, code, signupToken);
        PendingSignup pending = verified.pending();
        try {
            throwIfTaken(pending.email(), pending.phone());
        } catch (DuplicateAccountException e) {
            emailVerification.discard(pending.email());
            throw e;
        }
        TransactionHelper.afterCompletion(
                () -> emailVerification.discard(pending.email()),
                () -> emailVerification.restore(verified));
        User user =
                userRepository.save(
                        User.builder()
                                .fullName(pending.fullName())
                                .email(pending.email())
                                .phone(pending.phone())
                                .address(pending.address())
                                .addressParts(pending.addressParts())
                                .passwordHash(pending.passwordHash())
                                .role(RoleType.CUSTOMER)
                                .build());
        return issueTokens(user);
    }

    private void throwIfTaken(String email, String phone) {
        Map<String, String> taken = new LinkedHashMap<>();
        if (userRepository.existsByEmail(email)) {
            taken.put("email", "This email is already registered.");
        }
        if (userRepository.existsByPhone(phone)) {
            taken.put("phone", "This phone number is already registered.");
        }
        if (!taken.isEmpty()) {
            throw new DuplicateAccountException(taken);
        }
    }

    @Override
    @Transactional
    public AuthResult authenticate(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user =
                userRepository
                        .findByEmail(email)
                        .filter(
                                u ->
                                        u.getPasswordHash() != null
                                                && passwordEncoder.matches(
                                                        request.password(), u.getPasswordHash()))
                        .orElseThrow(
                                () ->
                                        new BadCredentialsException(
                                                "Email or password is incorrect."));
        DeactivationMessage.assertActive(user);
        if (request.requiredRole() != null && user.getRole() != request.requiredRole()) {
            throw new RoleMismatchException();
        }
        return issueTokensOrChallenge(user, !Boolean.FALSE.equals(request.rememberMe()));
    }

    @Override
    @Transactional
    public AuthResult completeMfaLogin(String mfaToken, String code, String recoveryCode) {
        PendingLogin pending = mfaService.verifyChallenge(mfaToken, code, recoveryCode);
        User user =
                userRepository
                        .findById(pending.userId())
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        DeactivationMessage.assertActive(user);
        return issueTokens(user, pending.rememberMe());
    }

    @Override
    public AuthResult refresh(String rawRefreshToken) {
        RefreshResult rotated = refreshTokenService.rotateToken(rawRefreshToken);
        User user =
                userRepository
                        .findById(rotated.userId())
                        .orElseThrow(
                                () -> new BadCredentialsException("Refresh token is not valid."));
        DeactivationMessage.assertActive(user);
        return buildAuthResult(user, rotated.newRefreshToken(), rotated.rememberMe());
    }

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
        DeactivationMessage.assertActive(user);
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

    private User claimByVerifiedEmail(User user, SocialProfile profile) {
        if (socialAccountRepository.existsByUserIdAndProvider(user.getId(), profile.provider())) {
            throw new DuplicateAccountException(
                    "email",
                    "This email is already linked to another account from the same provider.");
        }
        if (user.getPasswordHash() != null) {
            user.setPasswordHash(null);
            userRepository.save(user);
            refreshTokenService.revokeAllTokens(user.getId());
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

    private static String fitsColumn(String url) {
        return url != null && url.length() <= 255 ? url : null;
    }

    @Override
    public UserResource getProfile(Long userId) {
        return toResource(findActiveUser(userId));
    }

    @Override
    @Transactional
    public UserResource updateProfile(Long userId, UpdateProfileRequest request) {
        User user = findActiveUser(userId);
        String phone = request.phone().trim();
        if (userRepository.existsByPhoneAndIdNot(phone, userId)) {
            throw new DuplicateAccountException(
                    "phone", "This phone number is already registered.");
        }
        if (request.addressParts() != null) {
            ResolvedAddress address =
                    addressService.resolve(request.addressParts(), AddressPolicy.ACCOUNT);
            user.setAddress(address.formatted());
            user.setAddressParts(address.columns());
        } else if (user.getRole() != RoleType.ADMIN) {
            throw new InvalidFieldException("addressParts", "Choose your address.");
        }
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        return toResource(userRepository.saveAndFlush(user));
    }

    private User findActiveUser(Long userId) {
        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new BadCredentialsException("Account not found."));
        DeactivationMessage.assertActive(user);
        return user;
    }

    private AuthResult issueTokensOrChallenge(User user, boolean rememberMe) {
        if (user.getRole() == RoleType.ADMIN) {
            if (mfaService.isEnabled(user.getId())) {
                return AuthResult.mfaPending(
                        UserResource.builder().email(user.getEmail()).build(),
                        rememberMe,
                        mfaService.startChallenge(user.getId(), rememberMe));
            }
            if (mfaService.isSetupRequired(user.getId())) {
                AuthResult session = issueTokens(user, rememberMe);
                return AuthResult.mfaSetupPending(
                        session.accessToken(), session.refreshToken(), session.user(), rememberMe);
            }
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

    static UserResource toResource(User user) {
        return UserResource.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .addressParts(AddressPartsResource.from(user.getAddressParts()))
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .hasPassword(user.getPasswordHash() != null)
                .avatarUrl(user.getImage())
                .build();
    }

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
        TransactionHelper.afterCommit(
                () -> {
                    userSessionCache.revokeAll(userId);
                    jobQueue.enqueue(
                            PasswordResetService.JOB_NOTIFY_CHANGED, Map.of("email", email));
                });
    }

    @Override
    @Transactional
    public AuthResult restartSession(Long userId) {
        User user = findActiveUser(userId);
        refreshTokenService.revokeAllTokens(userId);
        userSessionCache.revokeAll(userId);
        return issueTokens(user, false);
    }

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
        DeactivationMessage.assertActive(user);
        if (user.getPasswordHash() != null) {
            throw new PasswordAlreadySetException();
        }
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
    }
}
