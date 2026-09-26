package com.techx.intervue.modules.user.resources;

/** FR-008: the two-step verification state of the signed-in admin. */
public record MfaStatusResource(boolean enabled, long recoveryCodesLeft) {}
