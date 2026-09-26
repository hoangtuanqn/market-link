package com.techx.intervue.modules.stall.exceptions;

/** An active farmer_markets row already exists for the (farmer, market) pair → 409. */
public class MarketAlreadyJoinedException extends RuntimeException {
    public MarketAlreadyJoinedException() {
        super("You already sell at this market.");
    }
}
