package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Instant;
import lombok.Builder;

/** Người đối diện trong một thread. Không lộ email, phone, address. FR-112: online / lần cuối. */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipantResource(
        Long userId,
        String fullName,
        RoleType role,
        String image,
        boolean online,
        Instant lastSeenAt) {

    public static ParticipantResource from(User user, PresenceService.PresenceInfo presence) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .online(presence != null && presence.online())
                .lastSeenAt(presence == null ? null : presence.lastSeenAt())
                .build();
    }
}
