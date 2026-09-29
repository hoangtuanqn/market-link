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

class ShelfLifeGuideControllerAccessTest {

    private static final String RULE =
            ShelfLifeGuideController.class.getAnnotation(PreAuthorize.class).value();

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
                                                "GET", "/api/v1/shelf-life-guides")));
        return decision != null && decision.isGranted();
    }

    @Test
    void farmersAndAdminsReadTheGroups() {
        assertThat(allowed("ROLE_FARMER")).isTrue();
        assertThat(allowed("ROLE_ADMIN")).isTrue();
    }

    @Test
    void aCustomerIsRefused() {
        assertThat(allowed("ROLE_CUSTOMER")).isFalse();
    }

    @Test
    void noEndpointReplacesTheClassRule() {
        List<Method> endpoints =
                Arrays.stream(ShelfLifeGuideController.class.getDeclaredMethods())
                        .filter(m -> !m.isSynthetic())
                        .toList();

        assertThat(endpoints).isNotEmpty();
        assertThat(endpoints).allMatch(m -> m.getAnnotation(PreAuthorize.class) == null);
        assertThat(ShelfLifeGuideController.class.getAnnotation(RequestMapping.class).value())
                .containsExactly("/api/v1/shelf-life-guides");
    }
}
