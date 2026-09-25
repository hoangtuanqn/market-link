package com.techx.intervue.modules.user.exceptions;

/** FR-008: token chờ nhập mã sai, đã dùng hoặc quá 5 phút → 400, phải đăng nhập lại. */
public class MfaTokenInvalidException extends RuntimeException {
    public MfaTokenInvalidException() {
        super("Your sign-in has expired. Sign in again.");
    }
}
