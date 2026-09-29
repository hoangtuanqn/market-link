package com.techx.intervue.modules.feedback.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFeedbackRequest(
        @NotBlank String type,
        @NotBlank
                @Size(min = 10, max = 2000, message = "Tell us a little more (10–2000 characters).")
                String message) {}
