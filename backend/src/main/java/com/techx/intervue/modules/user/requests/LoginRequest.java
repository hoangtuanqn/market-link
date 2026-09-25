package com.techx.intervue.modules.user.requests;

import com.techx.intervue.modules.user.enums.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** FR-003 */
public record LoginRequest(
        @NotBlank(message = "Enter your email.") @Email(message = "Enter a valid email address.")
                String email,
        @NotBlank(message = "Enter your password.") String password,
        /* "Remember me": false → phiên kết thúc khi đóng trình duyệt; không gửi thì coi như true */
        Boolean rememberMe,
        /*
         * FR-004: trang đăng nhập admin gửi "admin". Sai role thì 403 và không cấp token / cookie,
         * để không ghi đè phiên đang có trong trình duyệt. Không gửi thì role nào cũng được.
         */
        RoleType requiredRole) {}
