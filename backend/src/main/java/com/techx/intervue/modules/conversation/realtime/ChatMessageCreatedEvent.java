package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.resources.MessageResource;

/**
 * Published after commit when there is a new message, for other modules (notifications FR-042)
 * without making chat depend on them.
 */
public record ChatMessageCreatedEvent(
        Long conversationId, Long recipientId, MessageResource message) {}
