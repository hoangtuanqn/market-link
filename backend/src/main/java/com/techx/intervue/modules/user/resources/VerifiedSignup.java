package com.techx.intervue.modules.user.resources;

public record VerifiedSignup(PendingSignup pending, String codeHash, long codeSecondsLeft) {}
