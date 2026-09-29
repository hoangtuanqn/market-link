package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerRegisterRequest(
        @NotBlank(message = "Enter your full name.")
                @Size(max = 100, message = "Full name can be at most 100 characters.")
                String fullName,
        @NotBlank(message = "Enter your phone number.")
                @Pattern(regexp = RegisterRules.PHONE_REGEX, message = RegisterRules.PHONE_MESSAGE)
                String phone,
        @NotBlank(message = "Enter your email.")
                @Email(regexp = RegisterRules.EMAIL_REGEX, message = RegisterRules.EMAIL_MESSAGE)
                @Size(max = 100, message = "Email can be at most 100 characters.")
                String email,
        @NotNull(message = "Choose your address.") @Valid AddressPartsRequest addressParts,
        @NotBlank(message = "Enter your password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                @FitsBcrypt
                String password,
        @NotBlank(message = "Confirm your password.") String confirmPassword,
        @Size(max = 16, message = "Language can be at most 16 characters.") String language,
        String website,
        @Size(max = 64, message = "Fill in the form again.") String signupToken) {}
