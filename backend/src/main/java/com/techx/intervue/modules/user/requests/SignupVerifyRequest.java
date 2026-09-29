package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupVerifyRequest(
        @NotBlank(message = "Enter your email.")
                @Email(regexp = RegisterRules.EMAIL_REGEX, message = RegisterRules.EMAIL_MESSAGE)
                String email,
        @NotBlank(message = "Enter the 6-digit code.")
                @Pattern(regexp = "\\d{6}", message = "Enter the 6-digit code from the email.")
                String code,
        @NotBlank(message = "Fill in the form again.")
                @Size(max = 64, message = "Fill in the form again.")
                String signupToken) {}
