package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** FR-003 */
public record LoginRequest(
        @NotBlank(message = "Enter your email.") @Email(message = "Enter a valid email address.")
                String email,
        @NotBlank(message = "Enter your password.") String password) {}
