package com.techx.intervue.modules.catalog.exceptions;

/** The market `{id}` does not exist or is disabled → 404 (R-06). */
public class MarketNotFoundException extends RuntimeException {
    public MarketNotFoundException(long id) {
        super("Market not found.");
    }
}
