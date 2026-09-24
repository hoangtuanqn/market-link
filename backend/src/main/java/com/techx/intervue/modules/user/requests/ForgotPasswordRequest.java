package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** FR-007 */
public record ForgotPasswordRequest(
        @NotBlank(message = "Enter your email.")
                @Email(message = "Enter a valid email address.")
                @Size(max = 100, message = "Email can be at most 100 characters.")
                String email) {}
