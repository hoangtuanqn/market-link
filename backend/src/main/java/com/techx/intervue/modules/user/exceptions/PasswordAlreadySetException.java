package com.techx.intervue.modules.user.exceptions;

/**
 * Tài khoản đã có mật khẩu thì không đặt lại qua set-password được (phải dùng đổi / quên mật khẩu)
 * → 409.
 */
public class PasswordAlreadySetException extends RuntimeException {
    public PasswordAlreadySetException() {
        super("Your account already has a password.");
    }
}
