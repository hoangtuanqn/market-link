package com.techx.intervue.modules.user.resources;

public record MfaStatusResource(boolean enabled, boolean setupRequired, long recoveryCodesLeft) {
    public MfaStatusResource(boolean enabled, long recoveryCodesLeft) {
        this(enabled, false, recoveryCodesLeft);
    }
}
