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
 * Spec 7.4: mọi sự kiện theo user. Được gọi SAU commit (TransactionHelper.afterCommit trong
 * service), nên đọc unread ở đây là thấy tin vừa ghi. Lỗi gửi không được lan ra request REST đã
 * thành công.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StompChatEventPublisher implements ChatEventPublisherInterface {

    // /topic thay vì /queue: trên RabbitMQ, /queue/<x> tạo queue durable không tự xoá — mỗi phiên
    // WebSocket để lại 4 queue mồ côi; /topic/<x> là queue exclusive auto-delete, biến mất khi
    // ngắt.
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
        // Thiết bị khác của chính người gửi cũng cần bong bóng; tab đã gửi khử trùng theo id.
        send(message.senderId(), MESSAGES, message);
        send(recipient, CONVERSATIONS, updated(conversation, unreadFor(recipient, conversation)));
        send(message.senderId(), CONVERSATIONS, updated(conversation, 0L));
        // FR-042: popup cho người nhận (module notification nghe sự kiện này). Tin đã commit: lỗi
        // phía thông báo chỉ được ghi log, không được biến request gửi tin thành 500.
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

    /** Dùng chung cho typing và presence: đẩy payload bất kỳ tới một user. */
    public void send(Long userId, String destination, Object payload) {
        try {
            template.convertAndSendToUser(String.valueOf(userId), destination, payload);
        } catch (MessagingException e) {
            // Người nhận offline hoặc broker vừa rớt: tin đã nằm trong DB, lần mở sau sẽ thấy.
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
