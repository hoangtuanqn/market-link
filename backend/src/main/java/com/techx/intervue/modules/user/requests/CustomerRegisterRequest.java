package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** FR-001: a customer signing up must provide full name, phone number, email and address. */
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
        // The rules that depend on the country (province/ward for Vietnam…) are in AddressService
        @NotNull(message = "Choose your address.") @Valid AddressPartsRequest addressParts,
        @NotBlank(message = "Enter your password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                String password,
        @NotBlank(message = "Confirm your password.") String confirmPassword,
        // FR-009: language of the code email; anything unknown becomes English
        @Size(max = 16, message = "Language can be at most 16 characters.") String language,
        // FR-009: honeypot — the real form always sends it empty
        String website,
        // FR-009: the token this browser got for an earlier submit of the same address, if any
        @Size(max = 64, message = "Fill in the form again.") String signupToken) {}
