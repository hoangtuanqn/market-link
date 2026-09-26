package com.techx.intervue.modules.catalog.exceptions;

/** `{closureId}` không tồn tại hoặc không thuộc chợ trong path → 404 (R-06). */
public class MarketClosureNotFoundException extends RuntimeException {
    public MarketClosureNotFoundException() {
        super("Closed day not found.");
    }
}
