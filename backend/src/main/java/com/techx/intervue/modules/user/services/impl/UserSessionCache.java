package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class UserSessionCache {

    private final RedisTemplate<String, String> redis;
    private final ObjectMapper objectMapper;
    private final AuthConfig authConfig;
    private static final String KEY_PREFIX = "user:session:";

    /**
     * Mốc (epoch giây): access token có iat trước mốc này bị từ chối dù session đã được ghi lại.
     */
    private static final String REVOKED_BEFORE_PREFIX = "user:revoked-before:";

    public record SessionData(String email, Set<RoleType> roles) {}

    public void set(Long userId, String email, Set<RoleType> roles, Duration ttl) {
        String key = KEY_PREFIX + userId;
        try {
            redis.opsForValue()
                    .set(key, objectMapper.writeValueAsString(new SessionData(email, roles)), ttl);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not save the session to Redis.", e);
        }
    }

    public SessionData get(Long userId) {
        String key = KEY_PREFIX + userId;
        String raw = redis.opsForValue().get(key);
        if (raw == null) return null;
        try {
            return objectMapper.readValue(raw, SessionData.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public void evict(Long userId) {
        redis.delete(KEY_PREFIX + userId);
    }

    /**
     * Đổi role của một phiên đang sống (Admin duyệt Farmer). JwtAuthFilter dựng authority từ cache
     * này chứ không từ claim của token, nên chỉ ghi users.role thôi thì role mới phải chờ tới lần
     * refresh kế tiếp. Giữ nguyên TTL còn lại: đây là đổi quyền, không phải gia hạn phiên.
     */
    public void updateRoles(Long userId, Set<RoleType> roles) {
        SessionData current = get(userId);
        if (current == null) {
            return; // chưa đăng nhập ở đâu — lần đăng nhập sau đã đọc role mới từ DB
        }
        Long ttlSeconds = redis.getExpire(KEY_PREFIX + userId);
        if (ttlSeconds == null || ttlSeconds <= 0) {
            return; // phiên vừa hết hạn giữa hai lệnh, không dựng lại
        }
        set(userId, current.email(), roles, Duration.ofSeconds(ttlSeconds));
    }

    /**
     * Đăng xuất mọi thiết bị (đổi / đặt lại mật khẩu...). Chỉ xoá session là chưa đủ: user đăng
     * nhập lại thì session được ghi lại và access token cũ (bị lộ) hợp lệ trở lại. Nên ghi thêm mốc
     * thời gian, giữ đúng bằng thời gian sống của access token (sau đó mọi token cũ đã hết hạn).
     */
    public void revokeAll(Long userId) {
        evict(userId);
        redis.opsForValue()
                .set(
                        REVOKED_BEFORE_PREFIX + userId,
                        String.valueOf(Instant.now().toEpochMilli()),
                        Duration.ofMillis(authConfig.getExpirationTime()));
    }

    /** Token cấp trước lần revokeAll gần nhất (issuedAt lấy từ JwtService.extractIssuedAt). */
    public boolean isRevoked(Long userId, Instant issuedAt) {
        String raw = redis.opsForValue().get(REVOKED_BEFORE_PREFIX + userId);
        return raw != null && issuedAt.toEpochMilli() < Long.parseLong(raw);
    }
}
