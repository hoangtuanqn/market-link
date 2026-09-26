package com.techx.intervue.modules.stall.exceptions;

/** Đã có dòng farmer_markets đang bật cho cặp (farmer, market) → 409. */
public class MarketAlreadyJoinedException extends RuntimeException {
    public MarketAlreadyJoinedException() {
        super("You already sell at this market.");
    }
}
