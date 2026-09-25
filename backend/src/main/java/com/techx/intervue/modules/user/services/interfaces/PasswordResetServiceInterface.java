package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.requests.ResetPasswordRequest;
import java.util.Optional;

public interface PasswordResetServiceInterface {
    /**
     * Bước A: rate limit (theo email và theo IP) rồi đẩy job vào hàng đợi. Không báo email có tồn
     * tại hay không.
     */
    void requestReset(String email, String clientIp);

    /**
     * Bước B (chạy trong worker): tạo token mới cho email, xoá token cũ. Trả token gốc để gửi mail,
     * rỗng nếu email không thuộc tài khoản đang hoạt động.
     */
    Optional<IssuedResetToken> issueToken(String email);

    /**
     * Kiểm tra token còn hiệu lực mà không dùng mất nó (GET, không GETDEL) để FE chỉ hiện form khi
     * link hợp lệ. Trả email của tài khoản; token sai/hết hạn thì ném InvalidResetTokenException.
     */
    String verifyToken(String rawToken);

    /** Bước C + D: đổi mật khẩu bằng token, huỷ mọi phiên đăng nhập, gửi mail thông báo. */
    void resetPassword(ResetPasswordRequest request);

    record IssuedResetToken(String email, String fullName, String rawToken) {}
}
