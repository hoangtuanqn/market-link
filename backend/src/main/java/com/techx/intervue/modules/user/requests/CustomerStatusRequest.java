package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CustomerStatusRequest(
        @NotBlank String status,
        @Size(max = 255, message = "Keep the reason under 255 characters.") String reason,
        Instant until) {}
