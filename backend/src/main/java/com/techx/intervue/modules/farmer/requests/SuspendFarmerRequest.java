package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record SuspendFarmerRequest(
        @NotBlank(message = "Say why the stall is suspended.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason,
        Instant until) {}
