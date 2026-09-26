package com.techx.intervue.modules.stall.exceptions;

/** `{farmerMarketId}` does not exist → 404. */
public class FarmerMarketNotFoundException extends RuntimeException {
    public FarmerMarketNotFoundException() {
        super("Stall location not found.");
    }
}
