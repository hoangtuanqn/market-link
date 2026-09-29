package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;

public interface ChatEventPublisherInterface {

    void messageCreated(Conversation conversation, MessageResource message);

    void conversationRead(Conversation conversation, Long readerId, Instant readAt);

    void messageHidden(Conversation conversation, Long messageId);
}
