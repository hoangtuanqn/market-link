package com.techx.intervue.modules.user.resources;

/** FR-009: answer of /auth/register and /auth/register/resend — no account exists yet. */
public record SignupStartedResource(
        String email, long codeExpiresInSeconds, long resendAvailableInSeconds) {}
