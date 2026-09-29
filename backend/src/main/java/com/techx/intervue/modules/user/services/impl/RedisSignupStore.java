package com.techx.intervue.modules.user.services.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RedisSignupStore implements SignupStoreInterface {

    static final String PENDING = "signup:pending:";
    static final String CODE = "signup:code:";
    static final String ATTEMPTS = "signup:attempts:";
    static final String COOLDOWN = "signup:cooldown:";
    static final String SENDS_BY_EMAIL = "ratelimit:signup:";
    static final String SENDS_BY_IP = "ratelimit:signup-ip:";

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    @Override
    public void savePending(PendingSignup pending, Duration ttl) {
        try {
            redis.opsForValue()
                    .set(PENDING + pending.email(), objectMapper.writeValueAsString(pending), ttl);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Could not store the sign-up", e);
        }
    }

    @Override
    public Optional<PendingSignup> findPending(String email) {
        String json = redis.opsForValue().get(PENDING + email);
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, PendingSignup.class));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("A stored sign-up could not be read", e);
        }
    }

    @Override
    public void extendPending(String email, Duration ttl) {
        redis.expire(PENDING + email, ttl);
    }

    @Override
    public void deleteAll(String email) {
        redis.delete(List.of(PENDING + email, CODE + email, ATTEMPTS + email, COOLDOWN + email));
    }

    @Override
    public void saveCode(String email, String codeHash, Duration ttl) {
        redis.opsForValue().set(CODE + email, codeHash, ttl);
        redis.delete(ATTEMPTS + email);
    }

    @Override
    public Optional<String> findCode(String email) {
        return Optional.ofNullable(redis.opsForValue().get(CODE + email));
    }

    @Override
    public Optional<String> takeCode(String email) {
        return Optional.ofNullable(redis.opsForValue().getAndDelete(CODE + email));
    }

    @Override
    public void deleteCode(String email) {
        redis.delete(CODE + email);
    }

    @Override
    public long codeSecondsLeft(String email) {
        return secondsLeft(CODE + email);
    }

    @Override
    public int countAttempt(String email) {
        Long count = redis.opsForValue().increment(ATTEMPTS + email);
        redis.expire(ATTEMPTS + email, Duration.ofSeconds(Math.max(1, secondsLeft(CODE + email))));
        return count == null ? 0 : count.intValue();
    }

    @Override
    public boolean startCooldown(String email, Duration ttl) {
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(COOLDOWN + email, "1", ttl));
    }

    @Override
    public long cooldownSecondsLeft(String email) {
        return secondsLeft(COOLDOWN + email);
    }

    @Override
    public SendCount countEmailSend(String email, Duration window) {
        return count(SENDS_BY_EMAIL + email, window);
    }

    @Override
    public SendCount countIpSend(String ip, Duration window) {
        return count(SENDS_BY_IP + ip, window);
    }

    private SendCount count(String key, Duration window) {
        Long count = redis.opsForValue().increment(key);
        Long ttl = redis.getExpire(key);
        if (count == null || count == 1 || ttl == null || ttl < 0) {
            redis.expire(key, window);
            ttl = window.toSeconds();
        }
        return new SendCount(count == null ? 0 : count, ttl);
    }

    private long secondsLeft(String key) {
        Long ttl = redis.getExpire(key);
        return ttl == null || ttl < 0 ? 0 : ttl;
    }
}
