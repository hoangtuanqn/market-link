package com.techx.intervue.modules.user.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.config.AuthConfig;
import io.jsonwebtoken.IncorrectClaimException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = service("MarketLink");
    }

    private static JwtService service(String issuer) {
        AuthConfig authConfig = mock(AuthConfig.class);
        when(authConfig.getExpirationTime()).thenReturn(900_000L);
        when(authConfig.getIssuer()).thenReturn(issuer);
        when(authConfig.getSecretKey())
                .thenReturn(Base64.getEncoder().encodeToString(new byte[48]));
        return new JwtService(authConfig);
    }

    @Test
    void rejectsTokenFromAnotherIssuerWithSameSecret() {
        String foreign = service("OtherApp").generateToken(3L);

        assertThatThrownBy(() -> jwtService.extractSubject(foreign))
                .isInstanceOf(IncorrectClaimException.class);
    }

    @Test
    void issuedAtKeepsMilliseconds() {
        Instant before = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        String token = jwtService.generateToken(3L);
        Instant after = Instant.now();

        Instant issuedAt = jwtService.extractIssuedAt(token);

        assertThat(issuedAt).isBetween(before, after);
        assertThat(jwtService.extractSubject(token)).isEqualTo(3L);
    }
}
