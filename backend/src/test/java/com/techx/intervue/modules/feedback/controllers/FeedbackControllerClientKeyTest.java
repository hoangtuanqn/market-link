package com.techx.intervue.modules.feedback.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

/**
 * FR-081 rate limit key. A client can send any {@code X-Forwarded-For} it likes, so the controller
 * must not read the header itself: it takes {@code getRemoteAddr()}, and behind a real proxy Tomcat
 * rewrites that address from the header only when the request comes from a trusted internal proxy
 * ({@code server.forward-headers-strategy: native}).
 */
class FeedbackControllerClientKeyTest {

    @Test
    void aSpoofedForwardedHeaderDoesNotChangeTheKey() {
        HttpServletRequest http = mock(HttpServletRequest.class);
        when(http.getRemoteAddr()).thenReturn("203.0.113.7");
        when(http.getHeader("X-Forwarded-For")).thenReturn("10.0.0.1, 8.8.8.8");

        assertThat(FeedbackController.clientKey(http)).isEqualTo("203.0.113.7");
    }

    @Test
    void theKeyIsTheRemoteAddressWhenThereIsNoHeader() {
        HttpServletRequest http = mock(HttpServletRequest.class);
        when(http.getRemoteAddr()).thenReturn("198.51.100.4");

        assertThat(FeedbackController.clientKey(http)).isEqualTo("198.51.100.4");
    }
}
