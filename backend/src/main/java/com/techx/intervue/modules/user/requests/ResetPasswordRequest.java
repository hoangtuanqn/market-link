package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** FR-007: token lấy từ query ?token= của link trong mail. */
public record ResetPasswordRequest(
        @NotBlank(message = "Link không hợp lệ hoặc đã hết hạn!")
                @Size(max = 128, message = "Link không hợp lệ hoặc đã hết hạn!")
                String token,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới!")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                String newPassword,
        @NotBlank(message = "Vui lòng nhập lại mật khẩu!") String confirmPassword) {}
