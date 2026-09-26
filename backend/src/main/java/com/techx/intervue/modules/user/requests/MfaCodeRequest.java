package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** FR-008: confirm the 6-digit code when turning two-step verification on / off. */
public record MfaCodeRequest(
        @NotBlank(message = "Type the code first.")
                @Pattern(
                        regexp = "\\d{6}",
                        message = "Enter the six digits from your authenticator.")
                String code) {}
