package com.techx.intervue.modules.user.services.interfaces;

import com.techx.intervue.modules.user.resources.MfaSetupResource;
import com.techx.intervue.modules.user.resources.MfaStatusResource;
import java.util.List;

/** FR-008: xác thực hai bước TOTP cho admin. */
public interface MfaServiceInterface {

    /** Người vừa qua bước mật khẩu, chờ nhập mã. */
    record PendingLogin(Long userId, boolean rememberMe) {}

    boolean isEnabled(Long userId);

    /** Sau bước mật khẩu: lưu token chờ trong Redis, trả token gốc cho FE. */
    String startChallenge(Long userId, boolean rememberMe);

    /** Kiểm tra mã TOTP hoặc mã khôi phục; đúng thì huỷ token chờ và trả người đăng nhập. */
    PendingLogin verifyChallenge(String mfaToken, String code, String recoveryCode);

    MfaStatusResource status(Long userId);

    /** Tạo khoá mới (chưa bật) để quét QR. */
    MfaSetupResource setup(Long userId, String email);

    /** Xác nhận mã đầu tiên rồi bật; trả mã khôi phục một lần. */
    List<String> enable(Long userId, String code);

    void disable(Long userId, String code);

    /** Tạo 10 mã khôi phục mới (cần mã TOTP hiện tại), mã cũ hết hiệu lực ngay. */
    List<String> regenerateRecoveryCodes(Long userId, String code);
}
