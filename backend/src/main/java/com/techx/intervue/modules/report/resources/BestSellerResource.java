package com.techx.intervue.modules.report.resources;

import java.math.BigDecimal;

public record BestSellerResource(
        Long productId, String name, long quantitySold, BigDecimal revenue) {}
