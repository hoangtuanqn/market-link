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
        /* false: an account created through Google has not set a password → the FE invites them to set one */
        boolean hasPassword,
        /* a Google photo (full URL) or a self-uploaded photo ("/uploads/avatars/..."); when null the FE shows the initial letter */
        String avatarUrl) {}
