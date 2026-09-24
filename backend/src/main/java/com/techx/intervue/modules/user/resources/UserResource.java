package com.techx.intervue.modules.user.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UserResource(
        Long id,
        String email,
        String fullName,
        String phone,
        String address,
        RoleType role,
        Instant createdAt,
        /* false: tài khoản tạo qua Google/Facebook chưa đặt mật khẩu → FE mời đặt mật khẩu */
        boolean hasPassword) {}
