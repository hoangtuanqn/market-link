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

@Slf4j
@Service
@RequiredArgsConstructor
public class StompChatEventPublisher implements ChatEventPublisherInterface {

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
        send(message.senderId(), MESSAGES, message);
        send(recipient, CONVERSATIONS, updated(conversation, unreadFor(recipient, conversation)));
        send(message.senderId(), CONVERSATIONS, updated(conversation, 0L));
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

    public void send(Long userId, String destination, Object payload) {
        try {
            template.convertAndSendToUser(String.valueOf(userId), destination, payload);
        } catch (MessagingException e) {
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
