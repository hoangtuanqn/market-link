package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.CustomerRegisterRequest;
import com.techx.intervue.modules.user.requests.LoginRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.services.impl.BaseService;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
@Slf4j
public class UserService extends BaseService implements UserServiceInterface {

    private final UserSessionCache userSessionCache;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuthConfig authConfig;

    @Override
    @Transactional
    public AuthResult registerCustomer(CustomerRegisterRequest request) {
        if (!request.password().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Nhập lại mật khẩu không khớp!");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = request.phone().trim();
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateAccountException("email", "Email này đã tồn tại trong hệ thống!");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new DuplicateAccountException(
                    "phone", "Số điện thoại này đã tồn tại trong hệ thống!");
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
                        .filter(
                                u ->
                                        passwordEncoder.matches(
                                                request.password(), u.getPasswordHash()))
                        .orElseThrow(
                                () ->
                                        new BadCredentialsException(
                                                "Email hoặc mật khẩu không đúng!"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new DisabledException(
                    "Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên!");
        }
        return issueTokens(user);
    }

    private AuthResult issueTokens(User user) {
        String accessToken = jwtService.generateToken(user.getId());

        Duration ttl = Duration.ofMillis(authConfig.getExpirationTime());
        userSessionCache.set(user.getId(), user.getEmail(), Set.of(user.getRole()), ttl);

        IssuedToken refreshToken = refreshTokenService.issueRefreshToken(user.getId());
        UserResource userResource =
                UserResource.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .phone(user.getPhone())
                        .address(user.getAddress())
                        .role(user.getRole())
                        .createdAt(user.getCreatedAt())
                        .build();
        return new AuthResult(accessToken, refreshToken.rawToken(), userResource);
    }
}
