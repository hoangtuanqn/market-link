package com.techx.intervue.modules.stall.exceptions;

/**
 * D-09: chưa được duyệt (hoặc đang bị đình chỉ) thì không được ghi hồ sơ bán hàng → 403 (contract
 * §4).
 */
public class StallNotApprovedException extends RuntimeException {
    public StallNotApprovedException() {
        super("Your stall is pending admin approval.");
    }
}
