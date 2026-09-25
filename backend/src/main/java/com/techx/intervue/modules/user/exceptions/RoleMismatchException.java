package com.techx.intervue.modules.user.exceptions;

/** FR-004: đúng mật khẩu nhưng role không phải role mà trang đăng nhập yêu cầu → 403. */
public class RoleMismatchException extends RuntimeException {
    public RoleMismatchException() {
        super("This account cannot sign in here.");
    }
}
