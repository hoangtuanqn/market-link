package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Set a password for the first time for an account created through Google (no password yet). */
public record SetPasswordRequest(
        @NotBlank(message = "Enter a password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                String password,
        @NotBlank(message = "Confirm your password.") String confirmPassword) {}
