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
