package com.techx.intervue.modules.stall.requests;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/** PATCH /farmer/slots/{id} — a null field is left unchanged (contract §6). */
public record UpdateSlotRequest(@Min(1) @Max(100) Integer maxOrders, Boolean isActive) {}
