package com.techx.intervue.modules.user.exceptions;

/** Token đặt lại mật khẩu sai, đã dùng hoặc hết hạn → 400. */
public class InvalidResetTokenException extends RuntimeException {
    public InvalidResetTokenException() {
        super("This link is invalid or has expired.");
    }
}
