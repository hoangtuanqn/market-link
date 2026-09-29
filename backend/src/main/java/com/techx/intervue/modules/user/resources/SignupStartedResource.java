package com.techx.intervue.modules.user.resources;

public record SignupStartedResource(
        String email,
        long codeExpiresInSeconds,
        long resendAvailableInSeconds,
        String signupToken) {}
