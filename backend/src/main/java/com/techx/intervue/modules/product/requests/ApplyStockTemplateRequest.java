package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** Body của POST /api/v1/farmer/stock-templates/apply (contract §5, FR-063). */
public record ApplyStockTemplateRequest(@NotNull LocalDate targetDate) {}
