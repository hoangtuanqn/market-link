package com.techx.intervue.modules.user.resources;

/** FR-009: the raw code only travels from the worker into the mail, never into Redis. */
public record IssuedSignupCode(PendingSignup pending, String code) {}
