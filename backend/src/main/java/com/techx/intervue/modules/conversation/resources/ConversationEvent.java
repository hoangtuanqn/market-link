package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

/**
 * Pushed to /user/topic/conversations. type: "updated" (new message / preview / unread), "read", or
 * "hidden" (FR-116). messageId is only present on the "hidden" event. unreadCount is a Long so the
 * "read" event does not carry a fake 0 — the FE only updates the badge when the field is present.
 */
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

    /** FR-116: an admin hid a message; the client removes it from the thread without reloading. */
    public static final String HIDDEN = "hidden";
}
