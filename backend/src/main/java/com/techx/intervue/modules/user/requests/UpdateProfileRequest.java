package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Update personal information (Account page). The email cannot be changed here because it is used
 * to sign in and to receive the forgot-password link. Same rules as CustomerRegisterRequest
 * (FR-001), except that an admin may leave the address out.
 */
public record UpdateProfileRequest(
        @NotBlank(message = "Enter your full name.")
                @Size(max = 100, message = "Full name can be at most 100 characters.")
                String fullName,
        @NotBlank(message = "Enter your phone number.")
                @Pattern(regexp = RegisterRules.PHONE_REGEX, message = RegisterRules.PHONE_MESSAGE)
                String phone,
        // Required for customers and farmers; an admin may leave it out (UserService)
        @Valid AddressPartsRequest addressParts) {}
