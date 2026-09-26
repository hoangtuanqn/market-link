package com.techx.intervue.modules.catalog.exceptions;

/** `{closureId}` does not exist or does not belong to the market in the path → 404 (R-06). */
public class MarketClosureNotFoundException extends RuntimeException {
    public MarketClosureNotFoundException() {
        super("Closed day not found.");
    }
}
