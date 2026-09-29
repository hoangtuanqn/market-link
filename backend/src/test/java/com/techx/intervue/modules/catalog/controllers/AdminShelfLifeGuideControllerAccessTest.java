package com.techx.intervue.modules.catalog.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.bind.annotation.RequestMapping;

class AdminShelfLifeGuideControllerAccessTest {

    private static final String RULE =
            AdminShelfLifeGuideController.class.getAnnotation(PreAuthorize.class).value();

    private static boolean allowed(String... authorities) {
        var auth =
                new UsernamePasswordAuthenticationToken(
                        "someone",
                        null,
                        Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList());
        var decision =
                new WebExpressionAuthorizationManager(RULE)
                        .authorize(
                                () -> auth,
                                new RequestAuthorizationContext(
                                        new MockHttpServletRequest(
                                                "PUT", "/api/v1/admin/shelf-life-guides/1")));
        return decision != null && decision.isGranted();
    }

    @Test
    void onlyAnAdminManagesTheGroups() {
        assertThat(allowed("ROLE_ADMIN")).isTrue();
        assertThat(allowed("ROLE_FARMER")).isFalse();
        assertThat(allowed("ROLE_CUSTOMER")).isFalse();
    }

    @Test
    void sitsUnderTheAdminPathThatNeedsTwoStepVerification() {
        assertThat(AdminShelfLifeGuideController.class.getAnnotation(RequestMapping.class).value())
                .allMatch(path -> path.startsWith("/api/v1/admin/"));
    }

    @Test
    void noEndpointReplacesTheClassRule() {
        List<Method> endpoints =
                Arrays.stream(AdminShelfLifeGuideController.class.getDeclaredMethods())
                        .filter(m -> !m.isSynthetic())
                        .toList();

        assertThat(endpoints).hasSizeGreaterThanOrEqualTo(4);
        assertThat(endpoints).allMatch(m -> m.getAnnotation(PreAuthorize.class) == null);
    }
}
