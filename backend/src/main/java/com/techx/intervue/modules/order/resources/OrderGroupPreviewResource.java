package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;
import java.util.List;

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
