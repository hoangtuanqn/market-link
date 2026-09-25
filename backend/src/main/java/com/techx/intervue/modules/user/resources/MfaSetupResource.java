package com.techx.intervue.modules.user.resources;

/**
 * FR-008: khoá mới để quét QR. {@code otpauthUri} chứa khoá bí mật — FE tự vẽ QR, không gửi cho
 * dịch vụ QR bên ngoài.
 */
public record MfaSetupResource(String secret, String otpauthUri) {}
