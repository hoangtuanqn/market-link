package com.techx.intervue.helpers;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * The per-IP limits (sign-up codes, forgot password, sign-in) key on this address. A client can
 * send any forwarding header it likes, so reading one here let the limits be walked around by
 * changing it on every request. Only {@code getRemoteAddr()} counts: behind a trusted proxy Tomcat
 * rewrites it from X-Forwarded-For itself ({@code server.forward-headers-strategy: native}).
 */
class IpHelperTest {

    private static MockHttpServletRequest from(String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    @Test
    void aSpoofedForwardedForDoesNotChangeTheAddress() {
        MockHttpServletRequest request = from("203.0.113.7");
        request.addHeader("X-Forwarded-For", "10.0.0.1, 8.8.8.8");

        assertThat(IpHelper.getClientIp(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void noOtherForwardingHeaderIsTrustedEither() {
        MockHttpServletRequest request = from("203.0.113.7");
        request.addHeader("CF-Connecting-IP", "198.51.100.1");
        request.addHeader("X-Real-IP", "198.51.100.2");
        request.addHeader("Proxy-Client-IP", "198.51.100.3");
        request.addHeader("WL-Proxy-Client-IP", "198.51.100.4");

        assertThat(IpHelper.getClientIp(request)).isEqualTo("203.0.113.7");
    }

    @Test
    void aMissingAddressStillGivesAKey() {
        assertThat(IpHelper.getClientIp(from(""))).isEqualTo("unknown");
    }
}
