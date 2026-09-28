package com.techx.intervue.modules.farmer.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

/**
 * D-09: the suspension reason is shown back to the Farmer themself, so it is required and written
 * by the Admin. {@code until} is the moment it lifts by itself — null means it stays until an admin
 * reinstates the stall. "Must be in the future" is checked in the service, not here, so the message
 * can name the field.
 */
public record SuspendFarmerRequest(
        @NotBlank(message = "Say why the stall is suspended.")
                @Size(max = 255, message = "Keep the reason under 255 characters.")
                String reason,
        Instant until) {}
