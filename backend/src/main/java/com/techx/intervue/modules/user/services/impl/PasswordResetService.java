package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.PasswordResetConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.exceptions.InvalidResetTokenException;
import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import com.techx.intervue.modules.user.services.interfaces.PasswordResetServiceInterface;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService implements PasswordResetServiceInterface {

    public static final String JOB_SEND_LINK = "password-reset.send-link";
    public static final String JOB_NOTIFY_CHANGED = "password-reset.notify-changed";

    static final String RATE_LIMIT_PREFIX = "ratelimit:pwreset:";
    static final String RATE_LIMIT_IP_PREFIX = "ratelimit:pwreset-ip:";
    static final String TOKEN_PREFIX = "pwreset:token:";
    static final String USER_PREFIX = "pwreset:user:";

    private static final int TOKEN_BYTES = 32;

    private final StringRedisTemplate redis;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserSessionCache userSessionCache;
    private final PasswordEncoder passwordEncoder;
    private final TokenHashUtil tokenHashUtil;
    private final JobQueueInterface jobQueue;
    private final PasswordResetConfig config;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void requestReset(String email, String clientIp) {
        String normalized = normalize(email);
        if (isRateLimited(RATE_LIMIT_IP_PREFIX + clientIp, config.getMaxRequestsPerIp())
                || isRateLimited(RATE_LIMIT_PREFIX + normalized, config.getMaxRequests())) {
            log.info("Password reset rate limit exceeded, request dropped");
            return;
        }
        jobQueue.enqueue(JOB_SEND_LINK, Map.of("email", normalized));
    }

    private boolean isRateLimited(String key, long maxRequests) {
        Long count = redis.opsForValue().increment(key);
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        if (count == null || count == 1) {
            redis.expire(key, window);
        } else if (redis.getExpire(key) == -1) {
            redis.expire(key, window);
        }
        return count != null && count > maxRequests;
    }

    @Override
    public Optional<IssuedResetToken> issueToken(String email) {
        Optional<User> found =
                userRepository
                        .findByEmail(normalize(email))
                        .filter(u -> u.getStatus() == UserStatus.ACTIVE);
        if (found.isEmpty()) return Optional.empty();
        User user = found.get();

        deletePendingToken(user.getId());

        String rawToken = generateToken();
        String hash = tokenHashUtil.hash(rawToken);
        Duration ttl = Duration.ofSeconds(config.getTokenTtlSeconds());
        redis.opsForValue().set(TOKEN_PREFIX + hash, user.getId().toString(), ttl);
        redis.opsForValue().set(USER_PREFIX + user.getId(), hash, ttl);

        return Optional.of(new IssuedResetToken(user.getEmail(), user.getFullName(), rawToken));
    }

    @Override
    public String verifyToken(String rawToken) {
        String userId = redis.opsForValue().get(TOKEN_PREFIX + tokenHashUtil.hash(rawToken));
        if (userId == null) throw new InvalidResetTokenException();
        return userRepository
                .findById(Long.valueOf(userId))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .map(User::getEmail)
                .orElseThrow(InvalidResetTokenException::new);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Passwords do not match.");
        }

        String tokenKey = TOKEN_PREFIX + tokenHashUtil.hash(request.token());
        Long ttlSeconds = redis.getExpire(tokenKey);
        String userId = redis.opsForValue().getAndDelete(tokenKey);
        if (userId == null) throw new InvalidResetTokenException();

        User user =
                userRepository
                        .findById(Long.valueOf(userId))
                        .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                        .orElseThrow(InvalidResetTokenException::new);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        refreshTokenRepository.revokeAllRefreshTokenByUser(user.getId());
        Long id = user.getId();
        String email = user.getEmail();
        TransactionHelper.afterCompletion(
                () -> {
                    deletePendingToken(id);
                    userSessionCache.revokeAll(id);
                    jobQueue.enqueue(JOB_NOTIFY_CHANGED, Map.of("email", email));
                },
                () -> restoreToken(tokenKey, userId, ttlSeconds));
    }

    private void restoreToken(String tokenKey, String userId, Long ttlSeconds) {
        if (ttlSeconds != null && ttlSeconds > 0) {
            redis.opsForValue().set(tokenKey, userId, Duration.ofSeconds(ttlSeconds));
        }
    }

    private void deletePendingToken(Long userId) {
        String oldHash = redis.opsForValue().getAndDelete(USER_PREFIX + userId);
        if (oldHash != null) redis.delete(TOKEN_PREFIX + oldHash);
    }

    private String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
