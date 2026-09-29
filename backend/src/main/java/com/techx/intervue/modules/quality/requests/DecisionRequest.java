package com.techx.intervue.modules.quality.requests;

import jakarta.validation.constraints.Size;

public record DecisionRequest(
        @Size(max = 255, message = "Keep the note under 255 characters.") String note) {}
