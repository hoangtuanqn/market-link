package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.filters.JwtAuthFilter;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

/**
 * FR-008: the rule that keeps an admin who has not set up two-step verification out of the admin
 * API. It is a SpEL string, so a typo in it compiles and only shows up when someone signs in; these
 * cases evaluate the real expression from SecurityConfig.
 */
class SecurityConfigAdminAccessTest {

    private static final WebExpressionAuthorizationManager MANAGER =
            new WebExpressionAuthorizationManager(SecurityConfig.ADMIN_ACCESS);

    private static Authentication with(String... authorities) {
        return new UsernamePasswordAuthenticationToken(
                "someone",
                null,
                List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList());
    }

    private static boolean allowed(Authentication auth) {
        var context =
                new RequestAuthorizationContext(
                        new MockHttpServletRequest("GET", "/api/v1/admin/dashboard"));
        var decision = MANAGER.authorize(() -> auth, context);
        return decision != null && decision.isGranted();
    }

    @Test
    void adminWithTwoStepSetUpReachesTheAdminApi() {
        assertThat(allowed(with("ROLE_ADMIN"))).isTrue();
    }

    @Test
    void adminStillOwingTwoStepSetupIsRefused() {
        assertThat(allowed(with("ROLE_ADMIN", JwtAuthFilter.MFA_SETUP_PENDING))).isFalse();
    }

    @Test
    void aCustomerIsRefusedAsBefore() {
        assertThat(allowed(with("ROLE_CUSTOMER"))).isFalse();
    }
}
