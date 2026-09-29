package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.resources.MessageResource;

public record ChatMessageCreatedEvent(
        Long conversationId, Long recipientId, MessageResource message) {}
