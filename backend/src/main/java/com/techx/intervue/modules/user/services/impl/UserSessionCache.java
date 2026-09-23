package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Duration;
import java.util.Set;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class UserSessionCache {

    private final RedisTemplate<String, String> redis;
    private final ObjectMapper objectMapper;
    private static final String KEY_PREFIX = "user:session:";

    public record SessionData(String email, Set<RoleType> roles) {}

    public void set(Long userId, String email, Set<RoleType> roles, Duration ttl) {
        String key = KEY_PREFIX + userId;
        try {
            redis.opsForValue()
                    .set(key, objectMapper.writeValueAsString(new SessionData(email, roles)), ttl);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Không thể lưu session vào redis!", e);
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
}
