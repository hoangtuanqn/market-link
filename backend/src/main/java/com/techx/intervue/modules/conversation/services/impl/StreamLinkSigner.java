package com.techx.intervue.modules.conversation.services.impl;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * FR-115 (spec 2026-09-28-chat-media-design §5): signs the short-lived link a video element plays
 * from. A video element cannot send the Authorization header, so the link itself carries who it was
 * issued to (u), which path issued it (s: u = member, a = admin) and until when (e).
 *
 * <p>HMAC-SHA256 over "id|u|s|e". The key is derived from the JWT secret rather than being the JWT
 * secret itself, so a stream signature can never pass as anything else, and there is no new
 * environment variable to forget in production.
 */
@Component
public class StreamLinkSigner {

    private static final String ALGORITHM = "HmacSHA256";

    private final SecretKeySpec key;

    public StreamLinkSigner(@Value("${jwt.secret}") String jwtSecret) {
        this.key = new SecretKeySpec(sha256("chat-stream|" + jwtSecret), ALGORITHM);
    }

    public String sign(long attachmentId, long userId, char scope, long expEpochSeconds) {
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac(attachmentId, userId, scope, expEpochSeconds));
    }

    /** The link is still valid at {@code now} (the second it expires included) and untouched. */
    public boolean verify(
            long attachmentId, long userId, char scope, long exp, String signature, Instant now) {
        if (signature == null || (scope != 'u' && scope != 'a') || now.getEpochSecond() > exp) {
            return false;
        }
        byte[] given;
        try {
            given = Base64.getUrlDecoder().decode(signature);
        } catch (IllegalArgumentException e) {
            return false;
        }
        // Constant time, so the signature cannot be guessed byte by byte from response times
        return MessageDigest.isEqual(mac(attachmentId, userId, scope, exp), given);
    }

    private byte[] mac(long attachmentId, long userId, char scope, long exp) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            String payload = attachmentId + "|" + userId + "|" + scope + "|" + exp;
            return mac.doFinal(payload.getBytes(StandardCharsets.US_ASCII));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }

    private static byte[] sha256(String text) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
