package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The authorization code that Google returns to the frontend's redirect_uri (single use). */
public record SocialLoginRequest(
        @NotBlank(message = "Authorization code is missing.")
                @Size(max = 2048, message = "Authorization code is not valid.")
                String code) {}
