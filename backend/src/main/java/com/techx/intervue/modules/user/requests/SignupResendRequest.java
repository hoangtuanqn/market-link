package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupResendRequest(
        @NotBlank(message = "Enter your email.")
                @Email(regexp = RegisterRules.EMAIL_REGEX, message = RegisterRules.EMAIL_MESSAGE)
                String email,
        @NotBlank(message = "Fill in the form again.")
                @Size(max = 64, message = "Fill in the form again.")
                String signupToken) {}
