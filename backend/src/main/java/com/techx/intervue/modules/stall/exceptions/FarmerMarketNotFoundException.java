package com.techx.intervue.modules.stall.exceptions;

/** `{farmerMarketId}` không tồn tại → 404. */
public class FarmerMarketNotFoundException extends RuntimeException {
    public FarmerMarketNotFoundException() {
        super("Stall location not found.");
    }
}
