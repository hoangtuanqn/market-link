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
     * FR-006: access token vào blacklist Redis tới lúc hết hạn (JwtAuthFilter chặn theo jti),
     * refresh token trong cookie bị thu hồi ở DB nên không đổi được access token mới nữa.
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
     * FR-003: sai email hay sai mật khẩu đều trả chung một thông báo, không lộ email nào đã đăng
     * ký.
     */
    @Override
    @Transactional
    public AuthResult authenticate(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user =
                userRepository
                        .findByEmail(email)
                        // Tài khoản tạo từ Google chưa có mật khẩu
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
        // Kiểm tra trước khi cấp token: không phát cookie refresh cho tài khoản sai role
        if (request.requiredRole() != null && user.getRole() != request.requiredRole()) {
            throw new RoleMismatchException();
        }
        return issueTokensOrChallenge(user, !Boolean.FALSE.equals(request.rememberMe()));
    }

    /**
     * FR-008: bước 2 sau khi nhập mã TOTP / mã khôi phục đúng. Kiểm tra lại trạng thái tài khoản vì
     * admin có thể bị khoá trong 5 phút chờ nhập mã.
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
     * FR-003: đổi refresh token (cookie) lấy access token mới, refresh token được xoay vòng. Không
     * bọc @Transactional ở đây: rotateToken tự có transaction, nếu bọc thêm thì exception sẽ
     * rollback luôn việc thu hồi token khi phát hiện token bị dùng lại.
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
     * Đăng nhập Google sau khi backend đã tự xác minh với provider. Tìm theo (provider,
     * provider_user_id); lần đầu thì gắn vào user cùng email (chỉ khi email đã xác minh) hoặc tạo
     * customer mới chưa có mật khẩu / số điện thoại.
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
        // FR-008: đăng nhập Google không được bỏ qua bước 2
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
     * Gắn Google vào tài khoản có sẵn cùng email. Đăng ký bằng email không xác minh email, nên mật
     * khẩu hiện có có thể do người khác đặt trước (chiếm trước tài khoản). Provider đã xác minh chủ
     * email → xoá mật khẩu đó, thu hồi mọi refresh token và session; chủ thật đặt lại mật khẩu ở
     * bước set-password (hasPassword = false).
     */
    private User claimByVerifiedEmail(User user, SocialProfile profile) {
        // Email này đã gắn với một tài khoản khác cùng provider
        if (socialAccountRepository.existsByUserIdAndProvider(user.getId(), profile.provider())) {
            throw new DuplicateAccountException(
                    "email",
                    "This email is already linked to another account from the same provider.");
        }
        if (user.getPasswordHash() != null) {
            user.setPasswordHash(null);
            userRepository.save(user);
            refreshTokenService.revokeAllTokens(user.getId());
            // Chạy ngay (không đợi commit): session mới của chủ thật được ghi ở issueTokens sau đó
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

    /** users.image là VARCHAR(255); URL ảnh dài hơn thì bỏ qua. */
    private static String fitsColumn(String url) {
        return url != null && url.length() <= 255 ? url : null;
    }

    @Override
    public UserResource getProfile(Long userId) {
        return toResource(findActiveUser(userId));
    }

    /**
     * Chỉ sửa được tài khoản của chính mình (userId lấy từ access token, không nhận từ request).
     * Email giữ nguyên. Số điện thoại trùng với tài khoản khác → 409; hai request đua nhau lọt qua
     * bước kiểm tra thì UNIQUE của DB chặn (AuthExceptionHandler trả 409).
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

    /** FR-008: admin đã bật 2FA → chỉ trả token chờ; còn lại cấp phiên như cũ. */
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

    private static UserResource toResource(User user) {
        return UserResource.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .hasPassword(user.getPasswordHash() != null)
                .build();
    }

    /**
     * Đổi mật khẩu: cần đúng mật khẩu hiện tại. Sai thì 400 ở field currentPassword (không dùng 401
     * vì FE coi 401 là hết phiên và tự refresh). Đổi xong đăng xuất mọi thiết bị: thu hồi mọi
     * refresh token, sau khi commit thì revokeAll session Redis (JwtAuthFilter từ chối mọi access
     * token cấp trước đó) và gửi mail thông báo.
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
        // Commit lỗi thì mật khẩu chưa đổi: không đá văng phiên, không gửi mail
        TransactionHelper.afterCommit(
                () -> {
                    userSessionCache.revokeAll(userId);
                    jobQueue.enqueue(
                            PasswordResetService.JOB_NOTIFY_CHANGED, Map.of("email", email));
                });
    }

    /**
     * Đặt mật khẩu lần đầu cho tài khoản tạo qua Google. Chỉ khi chưa có mật khẩu — đã có thì phải
     * dùng đổi / quên mật khẩu (409). userId lấy từ access token (R-06). Phiên hiện tại giữ nguyên.
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
