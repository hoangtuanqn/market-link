package com.techx.intervue.modules.stall.exceptions;

public class FarmerMarketNotYoursException extends RuntimeException {
    public FarmerMarketNotYoursException() {
        super("This stall location is not yours.");
    }
}
