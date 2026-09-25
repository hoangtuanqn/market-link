package com.techx.intervue.filters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.impl.UserSessionCache.SessionData;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import jakarta.servlet.FilterChain;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

class JwtAuthFilterTest {

    private static final String TOKEN = "access-token";
    private static final Instant ISSUED_AT = Instant.parse("2026-09-25T03:00:00Z");

    private JwtServiceInterface jwtService;
    private UserSessionCache sessionCache;
    private FilterChain chain;
    private JwtAuthFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtServiceInterface.class);
        sessionCache = mock(UserSessionCache.class);
        chain = mock(FilterChain.class);
        filter =
                new JwtAuthFilter(
                        jwtService,
                        mock(BlacklistServiceInterface.class),
                        new ObjectMapper().findAndRegisterModules(),
                        sessionCache);
        request = new MockHttpServletRequest("GET", "/api/v1/auth/me");
        request.addHeader("Authorization", "Bearer " + TOKEN);
        response = new MockHttpServletResponse();
        when(jwtService.extractJti(TOKEN)).thenReturn("jti");
        when(jwtService.extractSubject(TOKEN)).thenReturn(1L);
        when(jwtService.extractIssuedAt(TOKEN)).thenReturn(ISSUED_AT);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void redisFailureReturns503InsteadOf401() throws Exception {
        when(sessionCache.get(1L)).thenThrow(new RedisConnectionFailureException("down"));

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(503);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void tokenIssuedBeforeRevokeAllIsRejected() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));
        when(sessionCache.isRevoked(1L, ISSUED_AT)).thenReturn(true);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void validTokenPassesThrough() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }
}
