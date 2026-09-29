package com.techx.intervue.modules.stall.exceptions;

public class FarmerMarketNotFoundException extends RuntimeException {
    public FarmerMarketNotFoundException() {
        super("Stall location not found.");
    }
}
