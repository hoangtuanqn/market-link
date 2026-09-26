package com.techx.intervue.helpers;

import java.nio.ByteBuffer;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * AES-256-GCM encryption for secrets that must be readable again (the TOTP key): unlike a password,
 * it cannot be hashed one-way. The result is the Base64 of iv (12 bytes) + ciphertext + tag, so a
 * leaked DB without the key cannot produce codes.
 */
public final class SecretCipher {

    private static final int KEY_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SecretKeySpec key;

    /**
     * @param base64Key 32 bytes in Base64 — generate with {@code openssl rand -base64 32}
     */
    public SecretCipher(String base64Key) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key == null ? "" : base64Key.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Encryption key is not valid Base64", e);
        }
        if (raw.length != KEY_BYTES) {
            throw new IllegalArgumentException("Encryption key must be 32 bytes (Base64)");
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public String encrypt(byte[] plaintext) {
        byte[] iv = new byte[IV_BYTES];
        RANDOM.nextBytes(iv);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] body = cipher.doFinal(plaintext);
            return Base64.getEncoder()
                    .encodeToString(
                            ByteBuffer.allocate(iv.length + body.length).put(iv).put(body).array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not encrypt", e);
        }
    }

    /** A wrong key or tampered data → IllegalArgumentException (GCM checks the tag). */
    public byte[] decrypt(String encoded) {
        try {
            ByteBuffer data = ByteBuffer.wrap(Base64.getDecoder().decode(encoded));
            byte[] iv = new byte[IV_BYTES];
            data.get(iv);
            byte[] body = new byte[data.remaining()];
            data.get(body);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return cipher.doFinal(body);
        } catch (GeneralSecurityException | RuntimeException e) {
            throw new IllegalArgumentException("Could not decrypt secret", e);
        }
    }
}
