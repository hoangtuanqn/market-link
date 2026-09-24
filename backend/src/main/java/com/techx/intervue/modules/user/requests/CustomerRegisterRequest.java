package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** FR-001: khách hàng đăng ký phải có họ tên, số điện thoại, email và địa chỉ. */
public record CustomerRegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ tên!")
                @Size(max = 100, message = "Họ tên tối đa 100 ký tự!")
                String fullName,
        @NotBlank(message = "Vui lòng nhập số điện thoại!")
                @Pattern(regexp = RegisterRules.PHONE_REGEX, message = RegisterRules.PHONE_MESSAGE)
                String phone,
        @NotBlank(message = "Vui lòng nhập email!")
                @Email(message = "Email không hợp lệ!")
                @Size(max = 100, message = "Email tối đa 100 ký tự!")
                String email,
        @NotBlank(message = "Vui lòng nhập địa chỉ!")
                @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự!")
                String address,
        @NotBlank(message = "Vui lòng nhập mật khẩu!")
                @Size(
                        min = RegisterRules.PASSWORD_MIN,
                        max = RegisterRules.PASSWORD_MAX,
                        message = RegisterRules.PASSWORD_MESSAGE)
                String password,
        @NotBlank(message = "Vui lòng nhập lại mật khẩu!") String confirmPassword) {}
