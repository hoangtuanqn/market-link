package com.techx.intervue.modules.quality.requests;

import com.techx.intervue.modules.quality.enums.QualityProblem;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Body of POST /orders/{id}/items/{itemId}/quality-report (spec §4.4.1). {@code photoUrl} is a URL
 * returned by POST /quality-reports/photos for the same account; the photo is optional.
 */
public record CreateQualityReportRequest(
        @NotNull(message = "Pick the day it spoiled.") LocalDate spoiledOn,
        @NotNull(message = "Pick what went wrong.") QualityProblem problem,
        @Size(max = 500, message = "Keep the description under 500 characters.") String note,
        @Size(max = 255) String photoUrl) {}
