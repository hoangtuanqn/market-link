package com.techx.intervue.modules.farmer.exceptions;

/** Duyệt/đình chỉ khi trạng thái hiện tại không đúng luồng cho phép → 409 (D-04-style). */
public class InvalidApprovalTransitionException extends RuntimeException {
    public InvalidApprovalTransitionException(String message) {
        super(message);
    }
}
