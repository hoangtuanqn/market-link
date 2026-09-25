package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.config.AuthConfig;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class UserSessionCacheTest {

    private RedisTemplate<String, String> redis;
    private ValueOperations<String, String> values;
    private UserSessionCache cache;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(RedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        AuthConfig authConfig = mock(AuthConfig.class);
        when(authConfig.getExpirationTime()).thenReturn(900_000L);
        cache = new UserSessionCache(redis, new ObjectMapper(), authConfig);
    }

    @Test
    void revokeAllDeletesSessionAndKeepsMarkerForAccessTokenLifetime() {
        cache.revokeAll(5L);

        verify(redis).delete("user:session:5");
        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(values).set(eq("user:revoked-before:5"), anyString(), ttl.capture());
        assertThat(ttl.getValue()).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void tokensIssuedBeforeMarkerAreRevoked() {
        when(values.get("user:revoked-before:5")).thenReturn("1000500");

        assertThat(cache.isRevoked(5L, Instant.ofEpochMilli(1000499))).isTrue();
        assertThat(cache.isRevoked(5L, Instant.ofEpochMilli(1000500))).isFalse();
        assertThat(cache.isRevoked(6L, Instant.ofEpochMilli(1))).isFalse();
    }
}
