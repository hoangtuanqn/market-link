package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;
import java.util.List;

/**
 * Một đơn sẽ được tách ra khi đặt (D-01). {@code problems} gom các vấn đề của group ({@code
 * out_of_stock}, {@code sold_out}, {@code unavailable}, {@code stall_suspended}) thay vì ném lỗi —
 * xem trước phải xem được. {@code markets} là các chợ stall đang bán; {@code marketId} / {@code
 * marketName} chỉ có khi stall bán đúng một chợ (C5-11).
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
