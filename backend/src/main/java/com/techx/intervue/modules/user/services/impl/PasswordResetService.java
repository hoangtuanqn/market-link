package com.techx.intervue.modules.user.services.impl;

import com.techx.intervue.config.PasswordResetConfig;
import com.techx.intervue.helpers.TokenHashUtil;
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
 * FR-007: quên mật khẩu bằng token lưu trong Redis (TTL 15 phút). Redis chỉ giữ sha256(token),
 * token gốc chỉ nằm trong mail.
 *
 * <pre>
 * ratelimit:pwreset:{email}   số lần yêu cầu trong cửa sổ 1 giờ
 * pwreset:token:{hash}        → user_id
 * pwreset:user:{user_id}      → hash (để xoá token cũ khi yêu cầu lại)
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService implements PasswordResetServiceInterface {

    public static final String JOB_SEND_LINK = "password-reset.send-link";
    public static final String JOB_NOTIFY_CHANGED = "password-reset.notify-changed";

    static final String RATE_LIMIT_PREFIX = "ratelimit:pwreset:";
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
     * Bước A. Không tra DB ở đây: mọi email (có hay không tồn tại) đều đi cùng một đường, việc tra
     * user + tạo token + gửi mail do worker làm nên thời gian phản hồi không lộ gì.
     */
    @Override
    public void requestReset(String email) {
        String normalized = normalize(email);
        if (isRateLimited(normalized)) {
            log.info("Quá giới hạn yêu cầu đặt lại mật khẩu, bỏ qua");
            return;
        }
        jobQueue.enqueue(JOB_SEND_LINK, Map.of("email", normalized));
    }

    /** INCR, lần đầu thì đặt EXPIRE. Nếu key bị mất TTL (crash giữa hai lệnh) thì đặt lại. */
    private boolean isRateLimited(String email) {
        String key = RATE_LIMIT_PREFIX + email;
        Long count = redis.opsForValue().increment(key);
        Duration window = Duration.ofSeconds(config.getWindowSeconds());
        if (count == null || count == 1) {
            redis.expire(key, window);
        } else if (redis.getExpire(key) == -1) {
            redis.expire(key, window);
        }
        return count != null && count > config.getMaxRequests();
    }

    /** Bước B. Chỉ tài khoản đang hoạt động mới được cấp token. */
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

    /**
     * Bước C + D. GETDEL nên token chỉ dùng được đúng một lần, kể cả khi gửi hai request cùng lúc.
     */
    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Kiểm tra trước GETDEL để nhập sai "nhập lại mật khẩu" không làm mất token
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new InvalidFieldException("confirmPassword", "Nhập lại mật khẩu không khớp!");
        }

        String userId =
                redis.opsForValue()
                        .getAndDelete(TOKEN_PREFIX + tokenHashUtil.hash(request.token()));
        if (userId == null) throw new InvalidResetTokenException();

        User user =
                userRepository
                        .findById(Long.valueOf(userId))
                        .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                        .orElseThrow(InvalidResetTokenException::new);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Xoá luôn token khác còn treo (nếu user bấm "gửi lại" sau khi đã nhận link này)
        deletePendingToken(user.getId());

        // Bước D: huỷ mọi phiên. Refresh token bị thu hồi ở DB; xoá session Redis thì JwtAuthFilter
        // từ chối mọi access token còn hạn của user này.
        refreshTokenRepository.revokeAllRefreshTokenByUser(user.getId());
        userSessionCache.evict(user.getId());

        jobQueue.enqueue(JOB_NOTIFY_CHANGED, Map.of("email", user.getEmail()));
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
