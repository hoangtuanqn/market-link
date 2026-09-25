package com.techx.intervue.modules.user.services.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.PasswordResetConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.services.interfaces.JobQueueInterface;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordResetServiceTest {

    private static final String IP = "203.0.113.9";

    private ValueOperations<String, String> values;
    private JobQueueInterface jobQueue;
    private PasswordResetService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        jobQueue = mock(JobQueueInterface.class);
        PasswordResetConfig config = mock(PasswordResetConfig.class);
        when(config.getMaxRequests()).thenReturn(5L);
        when(config.getMaxRequestsPerIp()).thenReturn(20L);
        when(config.getWindowSeconds()).thenReturn(3600L);
        service =
                new PasswordResetService(
                        redis,
                        mock(UserRepository.class),
                        mock(RefreshTokenRepository.class),
                        mock(UserSessionCache.class),
                        mock(PasswordEncoder.class),
                        mock(TokenHashUtil.class),
                        jobQueue,
                        config);
    }

    @Test
    void enqueuesWhenUnderBothLimits() {
        when(values.increment(anyString())).thenReturn(1L);

        service.requestReset(" An@Example.com ", IP);

        verify(jobQueue)
                .enqueue(PasswordResetService.JOB_SEND_LINK, Map.of("email", "an@example.com"));
    }

    @Test
    void dropsRequestWhenIpSentTooMany() {
        when(values.increment(PasswordResetService.RATE_LIMIT_IP_PREFIX + IP)).thenReturn(21L);
        when(values.increment(PasswordResetService.RATE_LIMIT_PREFIX + "new@example.com"))
                .thenReturn(1L);

        service.requestReset("new@example.com", IP);

        verify(jobQueue, never()).enqueue(anyString(), any());
    }
}
