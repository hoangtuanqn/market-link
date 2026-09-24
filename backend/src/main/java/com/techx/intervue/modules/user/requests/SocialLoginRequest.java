package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Authorization code mà Google/Facebook trả về redirect_uri của frontend (dùng 1 lần). */
public record SocialLoginRequest(
        @NotBlank(message = "Thiếu mã xác thực!")
                @Size(max = 2048, message = "Mã xác thực không hợp lệ!")
                String code) {}
