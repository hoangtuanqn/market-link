package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * D-09: the suspension reason is shown back to the Farmer themself, so it is required and written
 * by the Admin.
 */
public record SuspendFarmerRequest(
        @NotBlank(message = "Say why the stall is suspended.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason) {}
