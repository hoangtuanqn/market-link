package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Đổi mật khẩu trên trang Account. Cùng luật mật khẩu với đăng ký / đặt lại mật khẩu. */
public record ChangePasswordRequest(
        @NotBlank(message = "Enter your current password.") String currentPassword,
        @NotBlank(message = "Enter a new password.")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                String newPassword,
        @NotBlank(message = "Confirm your password.") String confirmPassword) {}
