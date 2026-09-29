package com.techx.intervue.helpers;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.OptionalLong;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class Totp {

    public static final int DIGITS = 6;
    public static final int PERIOD_SECONDS = 30;

    private static final int ALLOWED_DRIFT_STEPS = 1;

    private static final int MODULO = 1_000_000;
    private static final char[] BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private Totp() {}

    public static long stepAt(Instant instant) {
        return Math.floorDiv(instant.getEpochSecond(), PERIOD_SECONDS);
    }

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
            if (MessageDigest.isEqual(expected, given)) {
                return OptionalLong.of(step);
            }
        }
        return OptionalLong.empty();
    }

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
            throw new IllegalStateException("HmacSHA1 is not available", e);
        }
    }
}
