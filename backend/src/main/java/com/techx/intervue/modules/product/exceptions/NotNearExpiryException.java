package com.techx.intervue.modules.product.exceptions;

/**
 * FR-124 (spec §4.5.1): the batch is fresh on that pickup day — picked on the day itself, or more
 * than half of its shelf life is left — so it cannot go on a near-expiry deal → 400.
 */
public class NotNearExpiryException extends RuntimeException {
    public NotNearExpiryException(String message) {
        super(message);
    }
}
