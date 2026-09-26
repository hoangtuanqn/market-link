package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/**
 * Một dòng của group xem trước. {@code status} là trạng thái bán được thật: sản phẩm bị ẩn hoặc đã
 * xoá hiện {@code unavailable} dù cột status còn {@code available}.
 */
public record PreviewItemResource(
        Long productId,
        String name,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal,
        int stockQuantity,
        String status) {}
