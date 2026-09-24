package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.RegisterRequest;
import com.techx.intervue.modules.user.resources.AuthResult;
import com.techx.intervue.modules.user.resources.UserResource;
import com.techx.intervue.modules.user.services.interfaces.RefreshTokenServiceInterface.IssuedToken;
import com.techx.intervue.modules.user.services.interfaces.UserServiceInterface;
import com.techx.intervue.services.impl.BaseService;
import java.time.Duration;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
    // @Transactional
    public AuthResult register(RegisterRequest request, String ip) {
        // String key = "limit:register:" + ip;
        // Object cache = redis.opsForValue().get(key);
        // Long countReg = cache != null ? ((Number) cache).longValue() : 0;

        // if (countReg >= 2) {
        // throw new BadCredentialsException("Đã vượt quá giới hạn đăng ký trong
        // ngày!");
        // }
        String email = request.email();
        String phone = request.phone();
        if (userRepository.existsByEmail(email)) {
            throw new BadCredentialsException("Email này đã tồn tại trong hệ thống!");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new BadCredentialsException("Số điện thoại này đã tồn tại trong hệ thống!");
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw new BadCredentialsException("Nhập lại mật khẩu không chính xác!");
        }
        String password = passwordEncoder.encode(request.password());
        User user =
                userRepository.save(
                        User.builder()
                                .name(request.name())
                                .email(email)
                                .password(password)
                                .phone(phone)
                                .build());
        String accessToken = jwtService.generateToken(user.getId());

        Duration ttl = Duration.ofMillis(authConfig.getExpirationTime());
        userSessionCache.set(user.getId(), user.getEmail(), Set.of(RoleType.USER), ttl);

        IssuedToken refreshToken = refreshTokenService.issueRefreshToken(user.getId());
        UserResource userResource =
                UserResource.builder()
                        .id(user.getId())
                        .email(email)
                        .name(user.getName())
                        .phone(user.getPhone())
                        .build();

        // eventPublisher.publishEvent(
        // new UserRegisteredEvent(this, email, user.getName()));
        // countReg = redis.opsForValue().increment(key);
        // if (countReg == 1) {
        // redis.expire(key, Duration.ofHours(24));
        // }
        return new AuthResult(accessToken, refreshToken.rawToken(), userResource);
    }
}
