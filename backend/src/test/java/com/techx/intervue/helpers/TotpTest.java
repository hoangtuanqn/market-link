package com.techx.intervue.helpers;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class TotpTest {

    // The SHA1 sample key from RFC 6238, appendix B
    private static final byte[] RFC_SECRET =
            "12345678901234567890".getBytes(StandardCharsets.US_ASCII);

    /** RFC 6238 appendix B gives 8-digit codes; the 6-digit code is the last 6 digits. */
    @ParameterizedTest
    @CsvSource({
        "59, 287082",
        "1111111109, 081804",
        "1111111111, 050471",
        "1234567890, 005924",
        "2000000000, 279037",
        "20000000000, 353130"
    })
    void codeMatchesRfc6238Vectors(long epochSeconds, String expected) {
        long step = Totp.stepAt(Instant.ofEpochSecond(epochSeconds));
        assertThat(Totp.code(RFC_SECRET, step)).isEqualTo(expected);
    }

    @Test
    void stepIsThirtySecondWindow() {
        assertThat(Totp.stepAt(Instant.ofEpochSecond(0))).isZero();
        assertThat(Totp.stepAt(Instant.ofEpochSecond(29))).isZero();
        assertThat(Totp.stepAt(Instant.ofEpochSecond(30))).isEqualTo(1);
    }

    @Test
    void matchAcceptsPreviousCurrentAndNextStep() {
        Instant now = Instant.ofEpochSecond(1_111_111_111L);
        long step = Totp.stepAt(now);

        assertThat(Totp.match(RFC_SECRET, Totp.code(RFC_SECRET, step - 1), now)).hasValue(step - 1);
        assertThat(Totp.match(RFC_SECRET, Totp.code(RFC_SECRET, step), now)).hasValue(step);
        assertThat(Totp.match(RFC_SECRET, Totp.code(RFC_SECRET, step + 1), now)).hasValue(step + 1);
    }

    @Test
    void matchRejectsCodeTwoStepsAway() {
        Instant now = Instant.ofEpochSecond(1_111_111_111L);
        long step = Totp.stepAt(now);

        assertThat(Totp.match(RFC_SECRET, Totp.code(RFC_SECRET, step - 2), now)).isEmpty();
        assertThat(Totp.match(RFC_SECRET, Totp.code(RFC_SECRET, step + 2), now)).isEmpty();
    }

    @Test
    void matchRejectsMalformedCode() {
        Instant now = Instant.ofEpochSecond(59);
        assertThat(Totp.match(RFC_SECRET, "28708", now)).isEmpty();
        assertThat(Totp.match(RFC_SECRET, "28708a", now)).isEmpty();
        assertThat(Totp.match(RFC_SECRET, null, now)).isEmpty();
    }

    @Test
    void base32RoundTripsAndMatchesRfc4648() {
        // RFC 4648 §10
        assertThat(Totp.base32("foobar".getBytes(StandardCharsets.US_ASCII)))
                .isEqualTo("MZXW6YTBOI");
        assertThat(Totp.base32(RFC_SECRET)).isEqualTo("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    }
}
