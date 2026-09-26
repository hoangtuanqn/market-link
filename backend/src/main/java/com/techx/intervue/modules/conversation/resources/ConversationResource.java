package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationResource(
        Long id,
        ParticipantResource other,
        String lastMessageText,
        Instant lastMessageAt,
        long unreadCount,
        Instant createdAt,
        // Lúc người kia đọc tới gần nhất: "Seen" còn sau khi tải lại trang. Vắng nếu chưa đọc.
        Instant otherReadAt) {}
