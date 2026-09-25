package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Authorization code mà Google trả về redirect_uri của frontend (dùng 1 lần). */
public record SocialLoginRequest(
        @NotBlank(message = "Authorization code is missing.")
                @Size(max = 2048, message = "Authorization code is not valid.")
                String code) {}
