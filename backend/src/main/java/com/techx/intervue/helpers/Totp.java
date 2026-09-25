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
 * TOTP theo RFC 6238: HMAC-SHA1, 6 chữ số, bước 30 giây — đúng mặc định của Google/Microsoft
 * Authenticator. Tự viết thay vì thêm thư viện vì chỉ cần vài chục dòng và test được bằng bộ số mẫu
 * của RFC.
 */
public final class Totp {

    public static final int DIGITS = 6;
    public static final int PERIOD_SECONDS = 30;

    /** Chấp nhận bước liền trước và liền sau để bù lệch đồng hồ điện thoại. */
    private static final int ALLOWED_DRIFT_STEPS = 1;

    private static final int MODULO = 1_000_000;
    private static final char[] BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toCharArray();

    private Totp() {}

    public static long stepAt(Instant instant) {
        return Math.floorDiv(instant.getEpochSecond(), PERIOD_SECONDS);
    }

    /** Mã 6 số của một bước thời gian (RFC 4226 §5.3, dynamic truncation). */
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
     * Bước thời gian khớp với mã (trong khoảng ±1 bước quanh {@code now}), rỗng nếu không khớp. Gọi
     * phía trên tự chặn dùng lại bằng cách chỉ nhận bước lớn hơn bước đã dùng.
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
            // so sánh thời gian hằng, không lộ số chữ số đúng qua thời gian phản hồi
            if (MessageDigest.isEqual(expected, given)) {
                return OptionalLong.of(step);
            }
        }
        return OptionalLong.empty();
    }

    /** Base32 không padding (RFC 4648) — định dạng khoá mà app authenticator nhận. */
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
            // HmacSHA1 luôn có trong mọi JDK
            throw new IllegalStateException("HmacSHA1 is not available", e);
        }
    }
}
