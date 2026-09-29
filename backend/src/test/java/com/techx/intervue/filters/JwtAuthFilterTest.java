package com.techx.intervue.filters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.impl.UserSessionCache.SessionData;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.modules.user.services.interfaces.MfaServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import jakarta.servlet.FilterChain;
import java.time.Instant;
import java.util.Optional;
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
    private MfaServiceInterface mfaService;
    private UserRepository userRepository;
    private FilterChain chain;
    private JwtAuthFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtServiceInterface.class);
        sessionCache = mock(UserSessionCache.class);
        mfaService = mock(MfaServiceInterface.class);
        userRepository = mock(UserRepository.class);
        chain = mock(FilterChain.class);
        filter =
                new JwtAuthFilter(
                        jwtService,
                        mock(BlacklistServiceInterface.class),
                        new ObjectMapper().findAndRegisterModules(),
                        sessionCache,
                        mfaService,
                        userRepository);
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
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("\"code\":\"UNAUTHORIZED\"");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void tokenIssuedBeforeRevokeAllReturnsAccountDeactivatedWhenTheUserIsBanned() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));
        when(sessionCache.isRevoked(1L, ISSUED_AT)).thenReturn(true);
        User banned =
                User.builder()
                        .id(1L)
                        .status(UserStatus.INACTIVE)
                        .deactivationReason("No-shows")
                        .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(banned));

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString())
                .contains("\"code\":\"ACCOUNT_DEACTIVATED\"")
                .contains("No-shows");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void validTokenPassesThrough() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    /**
     * FR-008: sign-in hands an admin who has never set up two-step verification a working session,
     * so the SPA can drive the setup screen. Without a marker on that session, the token opens
     * every admin endpoint to anyone calling the API directly — the mandatory step guards the
     * screens only. SecurityConfig turns this authority into a 403 on /api/v1/admin/**.
     */
    @Test
    void adminWhoHasNotSetUpMfaIsMarkedPending() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.ADMIN)));
        when(mfaService.isSetupRequired(1L)).thenReturn(true);

        filter.doFilter(request, response, chain);

        assertThat(authorities()).contains("ROLE_ADMIN", "MFA_SETUP_PENDING");
    }

    @Test
    void adminWithMfaSetUpCarriesNoPendingMarker() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.ADMIN)));
        when(mfaService.isSetupRequired(1L)).thenReturn(false);

        filter.doFilter(request, response, chain);

        assertThat(authorities()).contains("ROLE_ADMIN").doesNotContain("MFA_SETUP_PENDING");
    }

    /** A customer has no row in admin_mfa either; the marker is for admins only. */
    @Test
    void customerIsNeverMarkedPending() throws Exception {
        when(sessionCache.get(1L)).thenReturn(new SessionData("a@b.c", Set.of(RoleType.CUSTOMER)));

        filter.doFilter(request, response, chain);

        assertThat(authorities()).doesNotContain("MFA_SETUP_PENDING");
    }

    private java.util.List<String> authorities() {
        return SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
                .map(Object::toString)
                .toList();
    }
}
