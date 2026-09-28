package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.geo.entities.AddressColumns;
import com.techx.intervue.modules.user.resources.PendingSignup;
import com.techx.intervue.modules.user.services.interfaces.SignupStoreInterface.SendCount;
import java.time.Duration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class RedisSignupStoreTest {

    private static final String EMAIL = "lan@example.com";

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private RedisSignupStore store;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        store = new RedisSignupStore(redis, new ObjectMapper());
    }

    @Test
    void aPendingSignUpRoundTripsThroughJson() {
        PendingSignup pending =
                new PendingSignup(
                        "Lan",
                        EMAIL,
                        "0900000002",
                        "12 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh",
                        new AddressColumns("VN", "79", "26743", "Lê Lợi", "12", null, null),
                        "bcrypt",
                        "vi");
        store.savePending(pending, Duration.ofSeconds(1800));
        ArgumentCaptor<String> json = ArgumentCaptor.forClass(String.class);
        verify(values)
                .set(eq("signup:pending:" + EMAIL), json.capture(), eq(Duration.ofSeconds(1800)));
        when(values.get("signup:pending:" + EMAIL)).thenReturn(json.getValue());

        PendingSignup read = store.findPending(EMAIL).orElseThrow();

        assertThat(read).usingRecursiveComparison().isEqualTo(pending);
    }

    @Test
    void aNewCodeClearsTheWrongAttempts() {
        store.saveCode(EMAIL, "hash", Duration.ofSeconds(600));

        verify(values).set("signup:code:" + EMAIL, "hash", Duration.ofSeconds(600));
        verify(redis).delete("signup:attempts:" + EMAIL);
    }

    @Test
    void theFirstSendStartsTheHourlyWindow() {
        when(values.increment("ratelimit:signup:" + EMAIL)).thenReturn(1L);
        when(redis.getExpire("ratelimit:signup:" + EMAIL)).thenReturn(-1L);

        SendCount count = store.countEmailSend(EMAIL, Duration.ofSeconds(3600));

        verify(redis).expire("ratelimit:signup:" + EMAIL, Duration.ofSeconds(3600));
        assertThat(count).isEqualTo(new SendCount(1, 3600));
    }

    @Test
    void aCounterThatLostItsTtlGetsItBack() {
        when(values.increment("ratelimit:signup-ip:203.0.113.9")).thenReturn(4L);
        when(redis.getExpire("ratelimit:signup-ip:203.0.113.9")).thenReturn(-1L);

        store.countIpSend("203.0.113.9", Duration.ofSeconds(3600));

        verify(redis).expire("ratelimit:signup-ip:203.0.113.9", Duration.ofSeconds(3600));
    }

    @Test
    void aMissingKeyHasNoSecondsLeft() {
        when(redis.getExpire(anyString())).thenReturn(-2L);

        assertThat(store.cooldownSecondsLeft(EMAIL)).isZero();
        assertThat(store.codeSecondsLeft(EMAIL)).isZero();
    }

    @Test
    void theCooldownIsSetOnlyWhenNoneIsRunning() {
        when(values.setIfAbsent("signup:cooldown:" + EMAIL, "1", Duration.ofSeconds(60)))
                .thenReturn(true, false);

        assertThat(store.startCooldown(EMAIL, Duration.ofSeconds(60))).isTrue();
        assertThat(store.startCooldown(EMAIL, Duration.ofSeconds(60))).isFalse();
    }
}
