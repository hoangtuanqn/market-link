package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.entities.SocialAccount;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.SocialAccountRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.requests.UpdateProfileRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.SocialProfile;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.RefreshResult;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.services.impl.BaseService;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
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
                        // Tài khoản tạo từ Google/Facebook chưa có mật khẩu
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
        return issueTokens(user);
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
        return buildAuthResult(user, rotated.newRefreshToken());
    }

    /**
     * Đăng nhập Google/Facebook sau khi backend đã tự xác minh với provider. Tìm theo (provider,
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
        return issueTokens(user);
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
                        .orElseGet(
                                () ->
                                        userRepository.save(
                                                User.builder()
                                                        .fullName(displayName(profile, email))
                                                        .email(email)
                                                        .image(fitsColumn(profile.pictureUrl()))
                                                        .role(RoleType.CUSTOMER)
                                                        .build()));
        // Email này đã gắn với một tài khoản khác cùng provider
        if (socialAccountRepository.existsByUserIdAndProvider(user.getId(), profile.provider())) {
            throw new DuplicateAccountException(
                    "email",
                    "This email is already linked to another account from the same provider.");
        }
        socialAccountRepository.save(
                SocialAccount.builder()
                        .userId(user.getId())
                        .provider(profile.provider())
                        .providerUserId(profile.providerUserId())
                        .email(email)
                        .build());
        return user;
    }

    private static String displayName(SocialProfile profile, String email) {
        String name =
                StringUtils.hasText(profile.name())
                        ? profile.name().trim()
                        : email.substring(0, email.indexOf('@'));
        return name.length() > 100 ? name.substring(0, 100) : name;
    }

    /** users.image là VARCHAR(255); URL ảnh dài hơn (Facebook hay có) thì bỏ qua. */
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

    private AuthResult issueTokens(User user) {
        IssuedToken refreshToken = refreshTokenService.issueRefreshToken(user.getId());
        return buildAuthResult(user, refreshToken.rawToken());
    }

    private AuthResult buildAuthResult(User user, String rawRefreshToken) {
        String accessToken = jwtService.generateToken(user.getId());

        Duration ttl = Duration.ofMillis(authConfig.getExpirationTime());
        userSessionCache.set(user.getId(), user.getEmail(), Set.of(user.getRole()), ttl);

        return new AuthResult(accessToken, rawRefreshToken, toResource(user));
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
                .build();
    }
}
