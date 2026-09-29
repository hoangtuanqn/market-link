package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class StreamLinkSignerTest {

    static final Instant NOW = Instant.parse("2026-09-28T03:00:00Z");
    static final long EXP = NOW.getEpochSecond() + 300;

    private final StreamLinkSigner signer = new StreamLinkSigner("test-jwt-secret");

    @Test
    void aFreshSignatureVerifies() {
        String sig = signer.sign(55L, 7L, 'u', EXP);

        assertThat(sig).matches("[A-Za-z0-9_-]+");
        assertThat(signer.verify(55L, 7L, 'u', EXP, sig, NOW)).isTrue();
        assertThat(signer.verify(55L, 7L, 'u', EXP, sig, Instant.ofEpochSecond(EXP))).isTrue();
    }

    @Test
    void anExpiredLinkIsRefused() {
        String sig = signer.sign(55L, 7L, 'u', EXP);

        assertThat(signer.verify(55L, 7L, 'u', EXP, sig, Instant.ofEpochSecond(EXP + 1))).isFalse();
    }

    @Test
    void changingTheUserOrScopeBreaksTheSignature() {
        String sig = signer.sign(55L, 7L, 'u', EXP);

        assertThat(signer.verify(55L, 8L, 'u', EXP, sig, NOW)).isFalse();
        assertThat(signer.verify(55L, 7L, 'a', EXP, sig, NOW)).isFalse();
        assertThat(signer.verify(56L, 7L, 'u', EXP, sig, NOW)).isFalse();
        assertThat(signer.verify(55L, 7L, 'u', EXP + 3600, sig, NOW)).isFalse();
    }

    @Test
    void aForgedSignatureIsRefused() {
        String other = new StreamLinkSigner("another-secret").sign(55L, 7L, 'u', EXP);

        assertThat(signer.verify(55L, 7L, 'u', EXP, other, NOW)).isFalse();
        assertThat(signer.verify(55L, 7L, 'u', EXP, "not base64 !!", NOW)).isFalse();
        assertThat(signer.verify(55L, 7L, 'u', EXP, "", NOW)).isFalse();
        assertThat(signer.verify(55L, 7L, 'u', EXP, null, NOW)).isFalse();
    }

    @Test
    void onlyTheTwoKnownScopesCanBeSigned() {
        String sig = signer.sign(55L, 7L, 'x', EXP);

        assertThat(signer.verify(55L, 7L, 'x', EXP, sig, NOW)).isFalse();
    }
}
