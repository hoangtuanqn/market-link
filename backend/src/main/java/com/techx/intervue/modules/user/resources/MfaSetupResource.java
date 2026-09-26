package com.techx.intervue.modules.user.resources;

/**
 * FR-008: a new key to scan as a QR. {@code otpauthUri} contains the secret key — the FE draws the
 * QR itself, and does not send it to an external QR service.
 */
public record MfaSetupResource(String secret, String otpauthUri) {}
