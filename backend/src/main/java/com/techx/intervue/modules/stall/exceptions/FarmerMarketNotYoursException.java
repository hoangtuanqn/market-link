package com.techx.intervue.modules.stall.exceptions;

/** R-06: `{farmerMarketId}` belongs to another stall → 403, even when the row is real. */
public class FarmerMarketNotYoursException extends RuntimeException {
    public FarmerMarketNotYoursException() {
        super("This stall location is not yours.");
    }
}
