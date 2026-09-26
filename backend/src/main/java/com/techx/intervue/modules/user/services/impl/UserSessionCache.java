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
     * Marker (epoch seconds): an access token whose iat is before this marker is rejected even
     * though the session was recorded again.
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
     * Change the role of a live session (Admin approves a Farmer). JwtAuthFilter builds authorities
     * from this cache and not from the token's claim, so writing only users.role would make the new
     * role wait until the next refresh. The remaining TTL is kept: this is a permission change, not
     * a session extension.
     */
    public void updateRoles(Long userId, Set<RoleType> roles) {
        SessionData current = get(userId);
        if (current == null) {
            return; // not signed in anywhere — the next sign-in already reads the new role from the
            // DB
        }
        Long ttlSeconds = redis.getExpire(KEY_PREFIX + userId);
        if (ttlSeconds == null || ttlSeconds <= 0) {
            return; // the session just expired between two commands, do not rebuild it
        }
        set(userId, current.email(), roles, Duration.ofSeconds(ttlSeconds));
    }

    /**
     * Sign out of every device (password change / reset...). Deleting the session alone is not
     * enough: when the user signs in again the session is written again and the old (leaked) access
     * token becomes valid again. So also write a time marker, kept for exactly the access token
     * lifetime (after that every old token has expired).
     */
    public void revokeAll(Long userId) {
        evict(userId);
        redis.opsForValue()
                .set(
                        REVOKED_BEFORE_PREFIX + userId,
                        String.valueOf(Instant.now().toEpochMilli()),
                        Duration.ofMillis(authConfig.getExpirationTime()));
    }

    /**
     * Tokens issued before the latest revokeAll (issuedAt comes from JwtService.extractIssuedAt).
     */
    public boolean isRevoked(Long userId, Instant issuedAt) {
        String raw = redis.opsForValue().get(REVOKED_BEFORE_PREFIX + userId);
        return raw != null && issuedAt.toEpochMilli() < Long.parseLong(raw);
    }
}
