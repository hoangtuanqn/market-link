package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Enter your full name.")
                @Size(max = 100, message = "Full name can be at most 100 characters.")
                String fullName,
        @NotBlank(message = "Enter your phone number.")
                @Pattern(regexp = RegisterRules.PHONE_REGEX, message = RegisterRules.PHONE_MESSAGE)
                String phone,
        @Valid AddressPartsRequest addressParts) {}
