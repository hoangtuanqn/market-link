package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationEvent(
        String type,
        Long conversationId,
        Long messageId,
        String lastMessageText,
        Instant lastMessageAt,
        Long unreadCount,
        Long readerId,
        Instant readAt) {
    public static final String UPDATED = "updated";
    public static final String READ = "read";

    public static final String HIDDEN = "hidden";
}
