package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateStallMarketRequest(
        @Size(max = 30, message = "Stall code must be at most 30 characters.") String stallCode,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal stallLatitude,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal stallLongitude) {}
