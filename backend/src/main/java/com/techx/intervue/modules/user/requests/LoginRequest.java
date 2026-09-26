package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.user.enums.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** FR-003 */
public record LoginRequest(
        @NotBlank(message = "Enter your email.") @Email(message = "Enter a valid email address.")
                String email,
        @NotBlank(message = "Enter your password.") String password,
        /* "Remember me": false → the session ends when the browser closes; if not sent it counts as true */
        Boolean rememberMe,
        /*
         * FR-004: the admin sign-in page sends "admin". A wrong role gives 403 and issues no token / cookie,
         * so it does not overwrite the session already in the browser. If not sent any role is accepted.
         */
        RoleType requiredRole) {}
