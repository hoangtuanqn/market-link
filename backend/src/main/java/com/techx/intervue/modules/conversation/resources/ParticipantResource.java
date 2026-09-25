package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import lombok.Builder;

/** Người đối diện trong một thread. Không lộ email, phone, address. */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipantResource(Long userId, String fullName, RoleType role, String image) {

    public static ParticipantResource from(User user) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .build();
    }
}
