package com.techx.intervue.modules.notification.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.realtime.ChatMessageCreatedEvent;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.repositories.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatNotificationListenerTest {

    private static final long CUSTOMER = 3L;
    private static final long FARMER = 7L;

    @Mock NotificationServiceInterface notifications;
    @Mock UserRepository users;
    @Mock FarmerProfileRepository farmers;

    ChatNotificationListener listener;

    @BeforeEach
    void setUp() {
        listener = new ChatNotificationListener(notifications, users, farmers);
    }

    private void known(long id, String name, RoleType role) {
        when(users.findById(id))
                .thenReturn(Optional.of(User.builder().id(id).fullName(name).role(role).build()));
    }

    private static MessageResource msg(long sender, MessageKind kind, String body) {
        return MessageResource.builder()
                .id(100L)
                .conversationId(5L)
                .senderId(sender)
                .kind(kind)
                .body(body)
                .createdAt(Instant.parse("2026-09-25T05:00:00Z"))
                .build();
    }

    private NotificationEvent sent(long recipient) {
        ArgumentCaptor<NotificationEvent> e = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(notifications).dispatch(eq(List.of(recipient)), e.capture());
        return e.getValue();
    }

    @Test
    void aTextFromAFarmerShowsTheStallNameAndTheText() {
        known(FARMER, "Nguyễn Thị Tư", RoleType.FARMER);
        known(CUSTOMER, "Lan", RoleType.CUSTOMER);
        when(farmers.findByUserId(FARMER))
                .thenReturn(Optional.of(FarmerProfile.builder().stallName("Cô Tư Garden").build()));

        listener.on(
                new ChatMessageCreatedEvent(
                        5L, CUSTOMER, msg(FARMER, MessageKind.TEXT, "Mai còn xoài không chị?")));

        NotificationEvent e = sent(CUSTOMER);
        assertThat(e.kind()).isEqualTo(NotificationKind.MESSAGE);
        assertThat(e.title()).isEqualTo("Cô Tư Garden");
        assertThat(e.message()).isEqualTo("Mai còn xoài không chị?");
        assertThat(e.link()).isEqualTo("/messages?c=5");
        assertThat(e.conversationId()).isEqualTo(5L);
    }

    @Test
    void aFarmerWithoutAProfileFallsBackToTheirName() {
        known(FARMER, "Nguyễn Thị Tư", RoleType.FARMER);
        known(CUSTOMER, "Lan", RoleType.CUSTOMER);
        when(farmers.findByUserId(FARMER)).thenReturn(Optional.empty());

        listener.on(new ChatMessageCreatedEvent(5L, CUSTOMER, msg(FARMER, MessageKind.TEXT, "hi")));

        assertThat(sent(CUSTOMER).title()).isEqualTo("Nguyễn Thị Tư");
    }

    @Test
    void aFarmerRecipientGetsTheFarmerLinkAndTheCustomersName() {
        known(CUSTOMER, "Lan", RoleType.CUSTOMER);
        known(FARMER, "Nguyễn Thị Tư", RoleType.FARMER);

        listener.on(
                new ChatMessageCreatedEvent(5L, FARMER, msg(CUSTOMER, MessageKind.TEXT, "Hello")));

        NotificationEvent e = sent(FARMER);
        assertThat(e.link()).isEqualTo("/farmer/messages?c=5");
        assertThat(e.title()).isEqualTo("Lan");
    }

    @Test
    void aPhotoLeavesTheMessageToTheRenderer() {
        known(CUSTOMER, "Lan", RoleType.CUSTOMER);
        known(FARMER, "Tư", RoleType.FARMER);

        listener.on(
                new ChatMessageCreatedEvent(5L, FARMER, msg(CUSTOMER, MessageKind.IMAGE, null)));

        NotificationEvent e = sent(FARMER);
        assertThat(e.message()).isNull();
        assertThat(e.params()).containsEntry("sender", "Lan");
    }

    @Test
    void longTextIsCutTo120Characters() {
        known(CUSTOMER, "Lan", RoleType.CUSTOMER);
        known(FARMER, "Tư", RoleType.FARMER);

        listener.on(
                new ChatMessageCreatedEvent(
                        5L, FARMER, msg(CUSTOMER, MessageKind.TEXT, "x".repeat(300))));

        assertThat(sent(FARMER).message()).hasSize(120).endsWith("…");
    }

    @Test
    void aDeletedAccountIsIgnored() {
        when(users.findById(CUSTOMER)).thenReturn(Optional.empty());

        listener.on(new ChatMessageCreatedEvent(5L, FARMER, msg(CUSTOMER, MessageKind.TEXT, "hi")));

        verify(notifications, never()).dispatch(any(), any());
    }
}
