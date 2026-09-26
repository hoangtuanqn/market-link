package com.techx.intervue.modules.order.resources;

import java.math.BigDecimal;

/** Một dòng của {@code order_items} — tên/giá/đơn vị đã chép lúc đặt (contract §7). */
public record OrderItemResource(
        Long productId,
        String productName,
        String unit,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal subtotal) {}
