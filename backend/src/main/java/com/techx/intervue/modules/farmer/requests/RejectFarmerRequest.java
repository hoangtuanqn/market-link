package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectFarmerRequest(
        @NotBlank(message = "Choose a reason.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
