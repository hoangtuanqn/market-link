package com.techx.intervue.modules.catalog.exceptions;

public class MarketNotFoundException extends RuntimeException {
    public MarketNotFoundException(long id) {
        super("Market not found.");
    }
}
