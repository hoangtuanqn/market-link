package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** FR-003 */
public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email!") @Email(message = "Email không hợp lệ!")
                String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu!") String password) {}
