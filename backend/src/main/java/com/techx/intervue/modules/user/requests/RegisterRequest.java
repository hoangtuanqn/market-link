package com.techx.intervue.modules.user.requests;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Name is required!") String name,
        @NotBlank(message = "Email is required!") @Email(message = "Email invalid!") String email,
        @NotBlank(message = "Phone is required!")
                @Pattern(regexp = "^(0[3|5|7|8|9])+([0-9]{8})$", message = "Phone number invalid!")
                String phone,
        @NotBlank(message = "Password is required!")
                @Size(min = 6, message = "Minimum of 6 characters!")
                String password,
        @NotBlank(message = "Confirm password is required!")
                @Size(min = 6, message = "Minimum of 6 characters!")
                String confirmPassword) {}
