package com.techx.intervue.modules.catalog.exceptions;

public class MarketClosureNotFoundException extends RuntimeException {
    public MarketClosureNotFoundException() {
        super("Closed day not found.");
    }
}
