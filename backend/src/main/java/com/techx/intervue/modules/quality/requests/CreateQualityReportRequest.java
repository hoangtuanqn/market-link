package com.techx.intervue.modules.quality.requests;

import com.techx.intervue.modules.quality.enums.QualityProblem;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateQualityReportRequest(
        @NotNull(message = "Pick the day it spoiled.") LocalDate spoiledOn,
        @NotNull(message = "Pick what went wrong.") QualityProblem problem,
        @Size(max = 500, message = "Keep the description under 500 characters.") String note,
        @Size(max = 255) String photoUrl) {}
