package com.techx.intervue.modules.user.exceptions;

import lombok.Getter;

/** Lỗi nghiệp vụ gắn với một trường của form (vd. nhập lại mật khẩu không khớp) → 400. */
@Getter
public class InvalidFieldException extends RuntimeException {
    private final String field;

    public InvalidFieldException(String field, String message) {
        super(message);
        this.field = field;
    }
}
