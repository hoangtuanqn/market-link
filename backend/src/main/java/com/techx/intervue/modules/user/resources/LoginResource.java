package com.techx.intervue.modules.user.resources;

/**
 * FR-008: {@code mfaRequired = true} → chưa có phiên (accessToken null), FE chuyển sang màn nhập mã
 * và gửi {@code mfaToken} tới POST /auth/mfa/verify.
 */
public record LoginResource(
        String accessToken, UserResource user, boolean mfaRequired, String mfaToken) {

    public LoginResource(String accessToken, UserResource user) {
        this(accessToken, user, false, null);
    }
}
