package com.techx.intervue.modules.user.resources;

/**
 * FR-009: answer of /auth/register and /auth/register/resend — no account exists yet. The browser
 * keeps `signupToken` and sends it back to verify, resend or correct this sign-up.
 */
public record SignupStartedResource(
        String email,
        long codeExpiresInSeconds,
        long resendAvailableInSeconds,
        String signupToken) {}
