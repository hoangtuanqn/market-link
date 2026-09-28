package com.techx.intervue.modules.quality.requests;

import jakarta.validation.constraints.Size;

/**
 * PATCH /admin/quality-reports/{id}/confirm|dismiss (spec §4.4.3): optional when confirming,
 * required when dismissing (checked by the service, which answers 400 on {@code note}).
 */
public record DecisionRequest(
        @Size(max = 255, message = "Keep the note under 255 characters.") String note) {}
