package com.techx.intervue.helpers;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

class CookieHelperTest {

    @Test
    void secureCookieByDefaultSetting() {
        ResponseCookie cookie =
                CookieHelper.buildRefreshTokenCookie("token", Duration.ofDays(14), true, true);

        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(14));
        assertThat(cookie.toString()).contains("Secure");
    }

    @Test
    void plainHttpDeploymentDropsOnlyTheSecureFlag() {
        ResponseCookie cookie =
                CookieHelper.buildRefreshTokenCookie("token", Duration.ofDays(14), true, false);

        assertThat(cookie.isSecure()).isFalse();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Strict");
        assertThat(cookie.toString()).doesNotContain("Secure");
    }

    @Test
    void sessionCookieFollowsTheSecureSetting() {
        ResponseCookie secure =
                CookieHelper.buildRefreshTokenCookie("token", Duration.ofDays(14), false, true);
        ResponseCookie plain =
                CookieHelper.buildRefreshTokenCookie("token", Duration.ofDays(14), false, false);

        assertThat(secure.isSecure()).isTrue();
        assertThat(plain.isSecure()).isFalse();
        // no Max-Age: the browser removes it on close
        assertThat(plain.getMaxAge().isNegative()).isTrue();
    }

    @Test
    void clearCookieFollowsTheSecureSetting() {
        ResponseCookie cleared = CookieHelper.buildRefreshTokenCookie("", Duration.ZERO, false);

        assertThat(cleared.isSecure()).isFalse();
        assertThat(cleared.getMaxAge()).isEqualTo(Duration.ZERO);
    }
}
