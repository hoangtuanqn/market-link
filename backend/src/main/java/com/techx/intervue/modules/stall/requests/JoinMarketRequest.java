package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Body of POST /api/v1/farmer/markets (contract §4). The booth coordinates may be offset from the
 * market centre, or left empty.
 */
public record JoinMarketRequest(
        @NotNull(message = "Market is required.") Long marketId,
        @Size(max = 30) String stallCode,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal stallLatitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal stallLongitude) {}
