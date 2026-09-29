package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateSlotRequest(@Min(1) @Max(100) Integer maxOrders, Boolean isActive) {}
