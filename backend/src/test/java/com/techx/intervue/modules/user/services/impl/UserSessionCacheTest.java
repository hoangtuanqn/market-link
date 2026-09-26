package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
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

    /**
     * An admin approving a Farmer changes users.role, but JwtAuthFilter builds authorities from
     * this cache — without writing it back the new role only takes effect after the next refresh.
     */
    @Test
    void updateRolesRewritesTheSessionAndKeepsTheRemainingTtl() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        when(values.get("user:session:5"))
                .thenReturn(
                        mapper.writeValueAsString(
                                new UserSessionCache.SessionData(
                                        "khang@example.com", Set.of(RoleType.CUSTOMER))));
        when(redis.getExpire("user:session:5")).thenReturn(600L);

        cache.updateRoles(5L, Set.of(RoleType.FARMER));

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> ttl = ArgumentCaptor.forClass(Duration.class);
        verify(values).set(eq("user:session:5"), payload.capture(), ttl.capture());
        UserSessionCache.SessionData saved =
                mapper.readValue(payload.getValue(), UserSessionCache.SessionData.class);
        assertThat(saved.roles()).containsExactly(RoleType.FARMER);
        assertThat(saved.email()).isEqualTo("khang@example.com");
        assertThat(ttl.getValue()).isEqualTo(Duration.ofSeconds(600));
    }

    /**
     * Not signed in anywhere: no new session is created, the next sign-in already reads the new
     * role from the DB.
     */
    @Test
    void updateRolesDoesNothingWhenThereIsNoLiveSession() {
        when(values.get("user:session:5")).thenReturn(null);

        cache.updateRoles(5L, Set.of(RoleType.FARMER));

        verify(values, never()).set(eq("user:session:5"), anyString(), any(Duration.class));
    }

    @Test
    void tokensIssuedBeforeMarkerAreRevoked() {
        when(values.get("user:revoked-before:5")).thenReturn("1000500");

        assertThat(cache.isRevoked(5L, Instant.ofEpochMilli(1000499))).isTrue();
        assertThat(cache.isRevoked(5L, Instant.ofEpochMilli(1000500))).isFalse();
        assertThat(cache.isRevoked(6L, Instant.ofEpochMilli(1))).isFalse();
    }
}
