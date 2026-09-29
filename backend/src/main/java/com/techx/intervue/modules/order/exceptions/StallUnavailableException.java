package com.techx.intervue.modules.order.exceptions;

public class StallUnavailableException extends RuntimeException {
    public StallUnavailableException(Long farmerId) {
        super("This stall is not taking orders right now.");
    }
}
