package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.ConversationEvent;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class StompChatEventPublisherTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");
    SimpMessagingTemplate template;
    MessageRepository messages;
    StompChatEventPublisher publisher;
    Conversation thread;

    @BeforeEach
    void setUp() {
        template = mock(SimpMessagingTemplate.class);
        messages = mock(MessageRepository.class);
        publisher = new StompChatEventPublisher(template, messages);
        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        thread.noteNewMessage("Five bunches left", NOW);
        MessageRepository.UnreadRow row = mock(MessageRepository.UnreadRow.class);
        when(row.getConversationId()).thenReturn(42L);
        when(row.getTotal()).thenReturn(2L);
        when(messages.countUnreadByConversation(eq(3L), anyCollection())).thenReturn(List.of(row));
        when(messages.countUnreadByConversation(eq(7L), anyCollection())).thenReturn(List.of());
    }

    private static MessageResource msg(Long sender) {
        return MessageResource.builder()
                .id(100L)
                .conversationId(42L)
                .senderId(sender)
                .kind(MessageKind.TEXT)
                .body("hi")
                .createdAt(NOW)
                .build();
    }

    @Test
    void newMessageGoesToTheRecipientQueueAndBothConversationQueues() {
        publisher.messageCreated(thread, msg(7L));

        verify(template).convertAndSendToUser("3", "/topic/messages", msg(7L));
        ArgumentCaptor<ConversationEvent> ev = ArgumentCaptor.forClass(ConversationEvent.class);
        verify(template).convertAndSendToUser(eq("3"), eq("/topic/conversations"), ev.capture());
        assertThat(ev.getValue().type()).isEqualTo("updated");
        assertThat(ev.getValue().unreadCount()).isEqualTo(2L);
        assertThat(ev.getValue().lastMessageText()).isEqualTo("Five bunches left");
        verify(template)
                .convertAndSendToUser(
                        eq("7"), eq("/topic/conversations"), any(ConversationEvent.class));
    }

    /**
     * Người gửi mở thread trên máy khác (điện thoại): máy đó cũng phải thấy bong bóng, FE khử trùng
     * theo id.
     */
    @Test
    void theSenderAlsoGetsTheMessageForTheirOtherDevices() {
        publisher.messageCreated(thread, msg(7L));

        verify(template).convertAndSendToUser("7", "/topic/messages", msg(7L));
    }

    @Test
    void readReceiptGoesOnlyToTheOtherMember() {
        publisher.conversationRead(thread, 3L, NOW);

        ArgumentCaptor<ConversationEvent> ev = ArgumentCaptor.forClass(ConversationEvent.class);
        verify(template).convertAndSendToUser(eq("7"), eq("/topic/conversations"), ev.capture());
        assertThat(ev.getValue().type()).isEqualTo("read");
        assertThat(ev.getValue().readerId()).isEqualTo(3L);
        assertThat(ev.getValue().readAt()).isEqualTo(NOW);
        // "read" không phải cập nhật badge: unreadCount phải vắng mặt, không phải 0
        assertThat(ev.getValue().unreadCount()).isNull();
        verify(template, never()).convertAndSendToUser(eq("3"), any(), any());
    }

    @Test
    void publishingToAnOfflineRecipientDoesNotThrow() {
        doThrow(new MessagingException("no session"))
                .when(template)
                .convertAndSendToUser(eq("3"), eq("/topic/messages"), any());

        assertThatCode(() -> publisher.messageCreated(thread, msg(7L))).doesNotThrowAnyException();
    }
}
