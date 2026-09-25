package com.techx.intervue.helpers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class SecretCipherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    private final SecretCipher cipher = new SecretCipher(KEY);

    @Test
    void decryptReturnsWhatWasEncrypted() {
        byte[] secret = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
        assertThat(cipher.decrypt(cipher.encrypt(secret))).isEqualTo(secret);
    }

    @Test
    void encryptingTwiceGivesDifferentCiphertext() {
        byte[] secret = {1, 2, 3};
        assertThat(cipher.encrypt(secret)).isNotEqualTo(cipher.encrypt(secret));
    }

    @Test
    void tamperedCiphertextIsRejected() {
        byte[] raw = Base64.getDecoder().decode(cipher.encrypt(new byte[] {1, 2, 3}));
        raw[raw.length - 1] ^= 1;
        String tampered = Base64.getEncoder().encodeToString(raw);

        assertThatThrownBy(() -> cipher.decrypt(tampered))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void keyMustBe32BytesOfBase64() {
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);
        assertThatThrownBy(() -> new SecretCipher(shortKey))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SecretCipher("")).isInstanceOf(IllegalArgumentException.class);
    }
}
