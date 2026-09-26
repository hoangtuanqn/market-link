package com.techx.intervue.modules.stall.exceptions;

/** R-06: `{farmerMarketId}` thuộc stall khác → 403, kể cả khi dòng có thật. */
public class FarmerMarketNotYoursException extends RuntimeException {
    public FarmerMarketNotYoursException() {
        super("This stall location is not yours.");
    }
}
