package com.techx.intervue.helpers;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.OptionalLong;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * TOTP per RFC 6238: HMAC-SHA1, 6 digits, 30-second step — exactly the defaults of Google/Microsoft
 * Authenticator. Written by hand instead of adding a library because it only takes a few dozen
 * lines and can be tested with the RFC's sample vectors.
 */
public final class Totp {

    public static final int DIGITS = 6;
    public static final int PERIOD_SECONDS = 30;

    /** Accept the previous and next step to compensate for phone clock drift. */
    private static final int ALLOWED_DRIFT_STEPS = 1;

    private static final int MODULO = 1_000_000;
    private static final char[] BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private Totp() {}

    public static long stepAt(Instant instant) {
        return Math.floorDiv(instant.getEpochSecond(), PERIOD_SECONDS);
    }

    /** The 6-digit code for one time step (RFC 4226 §5.3, dynamic truncation). */
    public static String code(byte[] secret, long step) {
        byte[] hash = hmacSha1(secret, ByteBuffer.allocate(Long.BYTES).putLong(step).array());
        int offset = hash[hash.length - 1] & 0x0f;
        int binary =
                ((hash[offset] & 0x7f) << 24)
                        | ((hash[offset + 1] & 0xff) << 16)
                        | ((hash[offset + 2] & 0xff) << 8)
                        | (hash[offset + 3] & 0xff);
        return String.format("%0" + DIGITS + "d", binary % MODULO);
    }

    /**
     * The time step that matches the code (within ±1 step around {@code now}), empty if it does not
     * match. The caller guards against reuse by accepting only a step greater than the one already
     * used.
     */
    public static OptionalLong match(byte[] secret, String code, Instant now) {
        if (code == null || !code.matches("\\d{" + DIGITS + "}")) {
            return OptionalLong.empty();
        }
        long current = stepAt(now);
        byte[] given = code.getBytes(StandardCharsets.US_ASCII);
        for (long step = current - ALLOWED_DRIFT_STEPS;
                step <= current + ALLOWED_DRIFT_STEPS;
                step++) {
            byte[] expected = code(secret, step).getBytes(StandardCharsets.US_ASCII);
            // constant-time comparison, does not leak the number of correct digits through response
            // time
            if (MessageDigest.isEqual(expected, given)) {
                return OptionalLong.of(step);
            }
        }
        return OptionalLong.empty();
    }

    /** Base32 without padding (RFC 4648) — the key format that authenticator apps accept. */
    public static String base32(byte[] data) {
        StringBuilder out = new StringBuilder((data.length * 8 + 4) / 5);
        int buffer = 0;
        int bits = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xff);
            bits += 8;
            while (bits >= 5) {
                out.append(BASE32_ALPHABET[(buffer >> (bits - 5)) & 0x1f]);
                bits -= 5;
            }
        }
        if (bits > 0) {
            out.append(BASE32_ALPHABET[(buffer << (5 - bits)) & 0x1f]);
        }
        return out.toString();
    }

    private static byte[] hmacSha1(byte[] key, byte[] message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            return mac.doFinal(message);
        } catch (GeneralSecurityException e) {
            // HmacSHA1 is available in every JDK
            throw new IllegalStateException("HmacSHA1 is not available", e);
        }
    }
}
