package com.techx.intervue.modules.product.requests;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** POST /farmer/stock-templates/apply — the weekday of targetDate picks the templates. */
public record ApplyTemplateRequest(@NotNull LocalDate targetDate) {}
