package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/** Email hoặc số điện thoại đã được dùng cho tài khoản khác → 409. */
@Getter
public class DuplicateAccountException extends RuntimeException {
    private final String field;

    public DuplicateAccountException(String field, String message) {
        super(message);
        this.field = field;
    }
}
