package com.techx.intervue.modules.stall.exceptions;

public class MarketAlreadyJoinedException extends RuntimeException {
    public MarketAlreadyJoinedException() {
        super("You already sell at this market.");
    }
}
