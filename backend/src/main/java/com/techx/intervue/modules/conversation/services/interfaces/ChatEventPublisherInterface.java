package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;

/**
 * Spec 7.5: the business service only says "new message" / "read"; who receives it and through
 * which route is the job of the implementation. Plan 1 only logs; Plan 2 replaces it with STOMP
 * over RabbitMQ without touching the service.
 */
public interface ChatEventPublisherInterface {

    void messageCreated(Conversation conversation, MessageResource message);

    void conversationRead(Conversation conversation, Long readerId, Instant readAt);

    /**
     * FR-116: an admin hides a message; both people in the thread drop it from the screen
     * immediately.
     */
    void messageHidden(Conversation conversation, Long messageId);
}
