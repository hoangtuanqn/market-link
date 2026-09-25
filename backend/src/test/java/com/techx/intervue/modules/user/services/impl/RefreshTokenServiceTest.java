package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import com.techx.intervue.helpers.TokenHashUtil;
import com.techx.intervue.modules.user.entities.RefreshToken;
import com.techx.intervue.modules.user.repositories.RefreshTokenRepository;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

class RefreshTokenServiceTest {

    private static final String RAW = "raw-token";
    private static final Long USER_ID = 7L;

    private RefreshTokenRepository repository;
    private RefreshTokenService service;

    @BeforeEach
    void setUp() {
        repository = mock(RefreshTokenRepository.class);
        TokenHashUtil hashUtil = mock(TokenHashUtil.class);
        when(hashUtil.hash(RAW)).thenReturn("hash");
        service =
                new RefreshTokenService(
                        mock(JwtServiceInterface.class),
                        repository,
                        mock(AuthConfig.class),
                        hashUtil);
    }

    private void storedToken(Long replacedBy, Instant updatedAt) {
        RefreshToken token =
                RefreshToken.builder()
                        .id(1L)
                        .userId(USER_ID)
                        .tokenHash("hash")
                        .expiryDate(Instant.now().plus(1, ChronoUnit.DAYS))
                        .revoked(true)
                        .replacedByTokenId(replacedBy)
                        .updatedAt(updatedAt)
                        .build();
        when(repository.findByTokenHashForUpdate("hash")).thenReturn(Optional.of(token));
    }

    @Test
    void justRotatedTokenIsRejectedWithoutRevokingUser() {
        storedToken(2L, Instant.now().minusSeconds(3));

        assertThatThrownBy(() -> service.rotateToken(RAW))
                .isInstanceOf(BadCredentialsException.class);
        verify(repository, never()).revokeAllRefreshTokenByUser(anyLong());
    }

    @Test
    void oldRotatedTokenReuseRevokesAllTokens() {
        storedToken(2L, Instant.now().minus(RefreshTokenService.ROTATION_GRACE).minusSeconds(5));

        assertThatThrownBy(() -> service.rotateToken(RAW))
                .isInstanceOf(BadCredentialsException.class);
        verify(repository).revokeAllRefreshTokenByUser(USER_ID);
    }

    @Test
    void loggedOutTokenReuseRevokesAllTokens() {
        storedToken(null, Instant.now());

        assertThatThrownBy(() -> service.rotateToken(RAW))
                .isInstanceOf(BadCredentialsException.class);
        verify(repository).revokeAllRefreshTokenByUser(USER_ID);
    }
}
