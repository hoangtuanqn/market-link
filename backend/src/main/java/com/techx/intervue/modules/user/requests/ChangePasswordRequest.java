package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Enter your current password.") String currentPassword,
        @NotBlank(message = "Enter a new password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                @FitsBcrypt
                String newPassword,
        @NotBlank(message = "Confirm your password.") String confirmPassword) {}
