package com.techx.intervue.modules.catalog.exceptions;

/** `{id}` chợ không tồn tại hoặc đã tắt → 404 (R-06). */
public class MarketNotFoundException extends RuntimeException {
    public MarketNotFoundException(long id) {
        super("Market not found.");
    }
}
