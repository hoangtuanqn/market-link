package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParticipantResource(
        Long userId,
        String fullName,
        RoleType role,
        String image,
        boolean online,
        Instant lastSeenAt,
        Long farmerId,
        String stallName) {

    public static ParticipantResource from(
            User user, PresenceService.PresenceInfo presence, FarmerProfile stall) {
        return ParticipantResource.builder()
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .image(user.getImage())
                .online(presence != null && presence.online())
                .lastSeenAt(presence == null ? null : presence.lastSeenAt())
                .farmerId(stall == null ? null : stall.getId())
                .stallName(stall == null ? null : stall.getStallName())
                .build();
    }
}
