package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerifyResetTokenRequest(
        @NotBlank(message = "This link is invalid or has expired.")
                @Size(max = 128, message = "This link is invalid or has expired.")
                String token) {}
