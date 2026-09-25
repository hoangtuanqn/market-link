package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;

class MessageServiceTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");

    MessageRepository messages;
    ConversationRepository conversations;
    UserRepository users;
    StallAccessPolicyInterface policy;
    ChatEventPublisherInterface events;
    MessageService service;
    Conversation thread;

    @BeforeEach
    void setUp() {
        messages = mock(MessageRepository.class);
        conversations = mock(ConversationRepository.class);
        users = mock(UserRepository.class);
        policy = mock(StallAccessPolicyInterface.class);
        events = mock(ChatEventPublisherInterface.class);
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
        service =
                new MessageService(
                        messages,
                        conversations,
                        users,
                        policy,
                        events,
                        new ConversationLookup(conversations),
                        clock);

        thread = Conversation.between(3L, 7L);
        thread.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(thread));
        when(users.findById(7L))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(7L)
                                        .role(RoleType.CUSTOMER)
                                        .status(UserStatus.ACTIVE)
                                        .build()));
        when(users.findById(3L))
                .thenReturn(
                        Optional.of(
                                User.builder()
                                        .id(3L)
                                        .role(RoleType.FARMER)
                                        .status(UserStatus.ACTIVE)
                                        .build()));
        when(messages.save(any(Message.class)))
                .thenAnswer(
                        inv -> {
                            Message m = inv.getArgument(0);
                            m.setId(100L);
                            return m;
                        });
    }

    private static SendMessageRequest text(String body) {
        return new SendMessageRequest(null, body, null, null);
    }

    @Test
    void sendSavesTheMessageUpdatesThePreviewAndPublishesOnce() {
        MessageResource result = service.send(7L, 42L, text("  Are the tomatoes still fresh?  "));

        assertThat(result.id()).isEqualTo(100L);
        assertThat(result.body()).isEqualTo("Are the tomatoes still fresh?");
        assertThat(result.kind()).isEqualTo(MessageKind.TEXT);
        assertThat(thread.getLastMessageText()).isEqualTo("Are the tomatoes still fresh?");
        assertThat(thread.getLastMessageAt()).isEqualTo(NOW);
        assertThat(thread.readAtOf(7L)).isEqualTo(NOW);
        verify(conversations).save(thread);
        verify(events).messageCreated(thread, result);
        // Trả lời nghĩa là đã đọc tới đây: bên kia phải nhận "đã xem" (review Plan 1, minor #4)
        verify(events).conversationRead(thread, 7L, NOW);
    }

    @Test
    void sendKeepsTheContextPins() {
        MessageResource result =
                service.send(
                        7L,
                        42L,
                        new SendMessageRequest(MessageKind.TEXT, "Is this one?", 15L, 21L));

        assertThat(result.productId()).isEqualTo(15L);
        assertThat(result.orderId()).isEqualTo(21L);
    }

    @Test
    void sendFromANonMemberIsForbiddenAndSavesNothing() {
        assertThatThrownBy(() -> service.send(9L, 42L, text("hello")))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(messages, never()).save(any());
        verify(events, never()).messageCreated(any(), any());
    }

    @Test
    void sendAsksThePolicyWithSenderAndRecipient() {
        service.send(3L, 42L, text("Yes, picked this morning."));

        ArgumentCaptor<User> sender = ArgumentCaptor.forClass(User.class);
        ArgumentCaptor<User> recipient = ArgumentCaptor.forClass(User.class);
        verify(policy).assertCanSend(sender.capture(), recipient.capture());
        assertThat(sender.getValue().getId()).isEqualTo(3L);
        assertThat(recipient.getValue().getId()).isEqualTo(7L);
    }

    @Test
    void blankBodyIsRejectedBeforeAnythingIsSaved() {
        assertThatThrownBy(() -> service.send(7L, 42L, text("   \n\t ")))
                .isInstanceOf(EmptyMessageException.class);
        verify(messages, never()).save(any());
        assertThat(thread.getLastMessageText()).isNull();
    }

    @Test
    void nonTextKindsAreNotSupportedYet() {
        assertThatThrownBy(
                        () ->
                                service.send(
                                        7L,
                                        42L,
                                        new SendMessageRequest(MessageKind.IMAGE, "x", null, null)))
                .isInstanceOf(UnsupportedMessageKindException.class);
        verify(messages, never()).save(any());
    }

    @Test
    void previewIsCutToOneHundredSixtyCharacters() {
        String longBody = "a".repeat(2000);

        service.send(7L, 42L, text(longBody));

        assertThat(thread.getLastMessageText()).hasSize(MessageService.PREVIEW_LENGTH);
        ArgumentCaptor<Message> saved = ArgumentCaptor.forClass(Message.class);
        verify(messages).save(saved.capture());
        assertThat(saved.getValue().getBody()).hasSize(2000);
    }

    @Test
    void listWithoutBeforeUsesTheFirstPageQuery() {
        Message m = Message.builder().id(5L).conversationId(42L).senderId(3L).body("hi").build();
        when(messages.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(eq(42L), any()))
                .thenReturn(List.of(m));

        List<MessageResource> result = service.list(7L, 42L, null, 30);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(5L);
        verify(messages, never())
                .findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                        any(), any(), any());
    }

    @Test
    void listPassesTheConversationIdToTheRepositoryEvenWithBefore() {
        service.list(7L, 42L, 500L, 30);

        ArgumentCaptor<Long> conversationId = ArgumentCaptor.forClass(Long.class);
        verify(messages)
                .findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                        conversationId.capture(), eq(500L), any());
        assertThat(conversationId.getValue()).isEqualTo(42L);
    }

    @Test
    void listClampsPageSizeToFifty() {
        service.list(7L, 42L, null, 500);

        ArgumentCaptor<Pageable> page = ArgumentCaptor.forClass(Pageable.class);
        verify(messages)
                .findByConversationIdAndHiddenAtIsNullOrderByIdDesc(eq(42L), page.capture());
        assertThat(page.getValue().getPageSize()).isEqualTo(MessageService.MAX_PAGE);
    }
}
