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

/**
 * FR-007: forgot password with a token stored in Redis (TTL 15 minutes). Redis only keeps
 * sha256(token), the raw token only lives in the email.
 *
 * <pre>
 * ratelimit:pwreset:{email}   number of requests in a 1-hour window
 * ratelimit:pwreset-ip:{ip}   number of requests from one IP in a 1-hour window
 * pwreset:token:{hash}        → user_id
 * pwreset:user:{user_id}      → hash (to delete the old token on a new request)
 * </pre>
 */
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

    /**
     * Step A. No DB lookup here: every email (existing or not) takes the same path, the user lookup
     * + token creation + email sending is done by the worker so the response time reveals nothing.
     */
    @Override
    public void requestReset(String email, String clientIp) {
        String normalized = normalize(email);
        // By IP first: an IP sending many different emails uses each email only once so it slips
        // under the
        // per-email limit, yet still fills up Redis / the mail queue
        if (isRateLimited(RATE_LIMIT_IP_PREFIX + clientIp, config.getMaxRequestsPerIp())
                || isRateLimited(RATE_LIMIT_PREFIX + normalized, config.getMaxRequests())) {
            log.info("Password reset rate limit exceeded, request dropped");
            return;
        }
        jobQueue.enqueue(JOB_SEND_LINK, Map.of("email", normalized));
    }

    /**
     * INCR, set EXPIRE the first time. If the key lost its TTL (a crash between the two commands)
     * set it again.
     */
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

    /** Step B. Only an active account gets a token. */
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

    /** GET only (not GETDEL): the link still works for resetPassword after the form appears. */
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

    /**
     * Steps C + D. GETDEL so the token can only be used exactly once, even when two requests are
     * sent at the same time.
     */
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Check before GETDEL so mistyping "confirm password" does not lose the token
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

        // Step D: revoke every session. Refresh tokens are revoked in the DB (same transaction);
        // the Redis part and the
        // mail
        // only run after commit. If the commit fails, give the token back so the user can retry
        // with this same
        // link.
        refreshTokenRepository.revokeAllRefreshTokenByUser(user.getId());
        Long id = user.getId();
        String email = user.getEmail();
        TransactionHelper.afterCompletion(
                () -> {
                    // Also delete any other pending token (if the user pressed "resend" after
                    // already receiving this
                    // link)
                    deletePendingToken(id);
                    // JwtAuthFilter rejects every access token issued before this moment
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
