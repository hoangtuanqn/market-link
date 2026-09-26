package com.techx.intervue.modules.product.requests;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/** Body của PUT /api/v1/farmer/stock-templates (contract §5, FR-063) — ghi đè trọn bộ lịch tuần. */
public record StockTemplateRequest(@NotNull @Valid List<Item> items) {

    /** 0 = Chủ nhật … 6 = Thứ bảy. {@code defaultPrice} null = apply giữ nguyên giá hiện tại. */
    public record Item(
            @NotNull Long productId,
            @Min(0) @Max(6) int dayOfWeek,
            @NotNull @Min(0) Integer defaultQuantity,
            @DecimalMin("0") BigDecimal defaultPrice) {}
}
