package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record TopProductResource(
        Long productId,
        String name,
        String stallName,
        String unit,
        BigDecimal unitPrice,
        long quantitySold,
        BigDecimal revenue) {}
