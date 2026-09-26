package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.ConversationEvent;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Spec 7.4: every event goes per user. Called AFTER commit (TransactionHelper.afterCommit in the
 * service), so reading unread here sees the message that was just written. A send failure must not
 * spread to the REST request that already succeeded.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StompChatEventPublisher implements ChatEventPublisherInterface {

    // /topic instead of /queue: on RabbitMQ, /queue/<x> creates a durable queue that is never
    // auto-deleted — every WebSocket
    // session leaves 4 orphaned queues; /topic/<x> is an exclusive auto-delete queue that
    // disappears on
    // disconnect.
    public static final String MESSAGES = "/topic/messages";
    public static final String CONVERSATIONS = "/topic/conversations";
    public static final String TYPING = "/topic/typing";
    public static final String PRESENCE = "/topic/presence";

    private final SimpMessagingTemplate template;
    private final MessageRepository messages;
    private final ApplicationEventPublisher appEvents;

    @Override
    public void messageCreated(Conversation conversation, MessageResource message) {
        Long recipient = conversation.otherMember(message.senderId());
        send(recipient, MESSAGES, message);
        // The sender's other devices also need the bubble; the tab that sent it dedupes by id.
        send(message.senderId(), MESSAGES, message);
        send(recipient, CONVERSATIONS, updated(conversation, unreadFor(recipient, conversation)));
        send(message.senderId(), CONVERSATIONS, updated(conversation, 0L));
        // FR-042: popup for the recipient (the notification module listens to this event). The
        // message is committed: a failure
        // on the notification side is only logged, it must not turn the send-message request into a
        // 500.
        try {
            appEvents.publishEvent(
                    new ChatMessageCreatedEvent(conversation.getId(), recipient, message));
        } catch (RuntimeException e) {
            log.warn("Chat notification for message {} failed: {}", message.id(), e.getMessage());
        }
    }

    @Override
    public void conversationRead(Conversation conversation, Long readerId, Instant readAt) {
        send(
                conversation.otherMember(readerId),
                CONVERSATIONS,
                ConversationEvent.builder()
                        .type(ConversationEvent.READ)
                        .conversationId(conversation.getId())
                        .readerId(readerId)
                        .readAt(readAt)
                        .build());
    }

    /**
     * FR-116. Reuses /topic/conversations instead of opening a new destination: the client already
     * subscribed to that channel and already has a branch that handles by `type`. Both people
     * receive it — the reported person must also see their own message disappear.
     */
    @Override
    public void messageHidden(Conversation conversation, Long messageId) {
        ConversationEvent event =
                ConversationEvent.builder()
                        .type(ConversationEvent.HIDDEN)
                        .conversationId(conversation.getId())
                        .messageId(messageId)
                        .build();
        send(conversation.getUserAId(), CONVERSATIONS, event);
        send(conversation.getUserBId(), CONVERSATIONS, event);
    }

    /** Shared by typing and presence: push any payload to one user. */
    public void send(Long userId, String destination, Object payload) {
        try {
            template.convertAndSendToUser(String.valueOf(userId), destination, payload);
        } catch (MessagingException e) {
            // The recipient is offline or the broker just dropped: the message is already in the DB
            // and they will see it next time they open.
            log.warn("Could not push {} to user {}: {}", destination, userId, e.getMessage());
        }
    }

    private long unreadFor(Long userId, Conversation c) {
        return messages.countUnreadByConversation(userId, List.of(c.getId())).stream()
                .filter(r -> c.getId().equals(r.getConversationId()))
                .mapToLong(MessageRepository.UnreadRow::getTotal)
                .findFirst()
                .orElse(0L);
    }

    private static ConversationEvent updated(Conversation c, long unread) {
        return ConversationEvent.builder()
                .type(ConversationEvent.UPDATED)
                .conversationId(c.getId())
                .lastMessageText(c.getLastMessageText())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .build();
    }
}
