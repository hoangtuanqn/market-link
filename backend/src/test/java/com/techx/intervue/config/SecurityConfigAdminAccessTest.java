package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.filters.JwtAuthFilter;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;

class SecurityConfigAdminAccessTest {

    private static final WebExpressionAuthorizationManager MANAGER =
            new WebExpressionAuthorizationManager(SecurityConfig.ADMIN_ACCESS);

    private static final WebExpressionAuthorizationManager SIGNED_IN =
            new WebExpressionAuthorizationManager(SecurityConfig.SIGNED_IN_ACCESS);

    private static Authentication with(String... authorities) {
        return new UsernamePasswordAuthenticationToken(
                "someone",
                null,
                List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList());
    }

    private static boolean allowed(Authentication auth) {
        return granted(MANAGER, auth, "/api/v1/admin/dashboard");
    }

    private static boolean signedInRouteAllowed(Authentication auth) {
        return granted(SIGNED_IN, auth, "/api/v1/orders/1");
    }

    private static boolean granted(
            WebExpressionAuthorizationManager manager, Authentication auth, String path) {
        var context = new RequestAuthorizationContext(new MockHttpServletRequest("GET", path));
        var decision = manager.authorize(() -> auth, context);
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

    @Test
    void adminStillOwingTwoStepSetupIsRefusedOnOtherSignedInRoutes() {
        assertThat(signedInRouteAllowed(with("ROLE_ADMIN", JwtAuthFilter.MFA_SETUP_PENDING)))
                .isFalse();
    }

    @Test
    void signedInUsersStillReachOtherSignedInRoutes() {
        assertThat(signedInRouteAllowed(with("ROLE_CUSTOMER"))).isTrue();
        assertThat(signedInRouteAllowed(with("ROLE_FARMER"))).isTrue();
        assertThat(signedInRouteAllowed(with("ROLE_ADMIN"))).isTrue();
    }

    @Test
    void anonymousCallerIsStillRefusedOnSignedInRoutes() {
        Authentication anonymous =
                new AnonymousAuthenticationToken(
                        "key",
                        "anonymousUser",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
        assertThat(signedInRouteAllowed(anonymous)).isFalse();
    }
}
