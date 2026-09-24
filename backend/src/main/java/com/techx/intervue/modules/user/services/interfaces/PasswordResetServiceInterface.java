package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import java.util.Optional;

public interface PasswordResetServiceInterface {
    /** Bước A: rate limit rồi đẩy job vào hàng đợi. Không báo email có tồn tại hay không. */
    void requestReset(String email);

    /**
     * Bước B (chạy trong worker): tạo token mới cho email, xoá token cũ. Trả token gốc để gửi mail,
     * rỗng nếu email không thuộc tài khoản đang hoạt động.
     */
    Optional<IssuedResetToken> issueToken(String email);

    /** Bước C + D: đổi mật khẩu bằng token, huỷ mọi phiên đăng nhập, gửi mail thông báo. */
    void resetPassword(ResetPasswordRequest request);

    record IssuedResetToken(String email, String fullName, String rawToken) {}
}
