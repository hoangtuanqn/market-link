package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * One order that will be split out when placed (D-01). {@code problems} collects the group's issues
 * ({@code out_of_stock}, {@code sold_out}, {@code unavailable}, {@code stall_suspended}) instead of
 * throwing — a preview must be able to show them. {@code markets} are the markets the stall sells
 * at; {@code marketId} / {@code marketName} are only present when the stall sells at exactly one
 * market (C5-11).
 */
public record OrderGroupPreviewResource(
        Long farmerId,
        String stallName,
        Long marketId,
        String marketName,
        int orderCutoffHours,
        List<PreviewItemResource> items,
        BigDecimal subtotal,
        List<String> problems,
        List<MarketOption> markets) {

    public record MarketOption(Long marketId, String marketName) {}
}
