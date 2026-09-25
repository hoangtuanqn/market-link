package com.techx.intervue.modules.user.exceptions;

/** FR-008: thao tác không hợp với trạng thái hiện tại (đã bật rồi, chưa cài…) → 409. */
public class MfaStateException extends RuntimeException {
    public MfaStateException(String message) {
        super(message);
    }
}
