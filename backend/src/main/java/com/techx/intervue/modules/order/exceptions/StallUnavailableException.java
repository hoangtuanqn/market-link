package com.techx.intervue.modules.order.exceptions;

/** D-09: stall chưa được duyệt hoặc đang bị đình chỉ không nhận đơn mới → 409 STALL_UNAVAILABLE. */
public class StallUnavailableException extends RuntimeException {
    public StallUnavailableException(Long farmerId) {
        super("This stall is not taking orders right now.");
    }
}
