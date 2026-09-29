package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.user.enums.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Enter your email.") @Email(message = "Enter a valid email address.")
                String email,
        @NotBlank(message = "Enter your password.") String password,
        Boolean rememberMe,
        RoleType requiredRole) {}
