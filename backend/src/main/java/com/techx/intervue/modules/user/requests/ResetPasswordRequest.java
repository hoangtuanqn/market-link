package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "This link is invalid or has expired.")
                @Size(max = 128, message = "This link is invalid or has expired.")
                String token,
        @NotBlank(message = "Enter a new password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                @FitsBcrypt
                String newPassword,
        @NotBlank(message = "Confirm your password.") String confirmPassword) {}
