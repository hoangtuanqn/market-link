package com.techx.intervue.modules.user.resources;

/** FR-008: trạng thái xác thực hai bước của admin đang đăng nhập. */
public record MfaStatusResource(boolean enabled, long recoveryCodesLeft) {}
