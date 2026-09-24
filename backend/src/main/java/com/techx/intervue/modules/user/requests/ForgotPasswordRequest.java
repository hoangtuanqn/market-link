package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** FR-007 */
public record ForgotPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email!")
                @Email(message = "Email không hợp lệ!")
                @Size(max = 100, message = "Email tối đa 100 ký tự!")
                String email) {}
