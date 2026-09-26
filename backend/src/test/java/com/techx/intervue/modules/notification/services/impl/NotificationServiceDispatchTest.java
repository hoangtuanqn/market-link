package com.techx.intervue.modules.notification.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.notification.config.NotificationMessagesConfig;
import com.techx.intervue.modules.notification.entities.Notification;
import com.techx.intervue.modules.notification.enums.NotificationKind;
import com.techx.intervue.modules.notification.repositories.NotificationRepository;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationEvent;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationPreferenceServiceInterface;
import com.techx.intervue.modules.user.entities.UserSettings;
import com.techx.intervue.modules.user.repositories.UserSettingsRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationServiceDispatchTest {

    @Mock NotificationRepository notifications;
    @Mock NotificationPreferenceServiceInterface prefs;
    @Mock NotificationDeliveryInterface delivery;
    @Mock UserSettingsRepository userSettings;
    @Mock StringRedisTemplate redis;

    final Clock clock = Clock.fixed(Instant.parse("2026-09-25T05:00:00Z"), ZoneOffset.UTC);
    NotificationService service;

    @BeforeEach
    void setUp() {
        service =
                new NotificationService(
                        notifications,
                        prefs,
                        delivery,
                        userSettings,
                        new NotificationTextRenderer(
                                new NotificationMessagesConfig().notificationMessages()),
                        redis,
                        clock);
    }

    @Test
    void aPersistentKindIsSavedInTheRecipientsLanguageAndPushed() {
        when(userSettings.findAllById(List.of(7L)))
                .thenReturn(List.of(UserSettings.builder().userId(7L).language("vi").build()));
        when(notifications.save(any()))
                .thenAnswer(
                        i -> {
                            Notification n = i.getArgument(0);
                            n.setId(99L);
                            n.setCreatedAt(Instant.parse("2026-09-25T04:59:59Z"));
                            return n;
                        });
        when(notifications.countByUserIdAndReadFalse(7L)).thenReturn(3L);
        when(prefs.alertFor(eq(7L), eq(NotificationKind.FARMER_APPROVED), any()))
                .thenReturn(new Alert(true, false, true));

        service.dispatch(
                List.of(7L),
                NotificationEvent.of(
                        NotificationKind.FARMER_APPROVED, "/farmer", Map.of("stall", "Cô Tư")));

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().getUserId()).isEqualTo(7L);
        assertThat(saved.getValue().getLink()).isEqualTo("/farmer");
        assertThat(saved.getValue().getTitle()).isEqualTo("Sạp của bạn đã được duyệt");

        ArgumentCaptor<NotificationPayload> sent =
                ArgumentCaptor.forClass(NotificationPayload.class);
        verify(delivery).deliver(eq(7L), sent.capture());
        NotificationPayload p = sent.getValue();
        assertThat(p.id()).isEqualTo(99L);
        assertThat(p.kind()).isEqualTo("farmer_approved");
        assertThat(p.title()).isEqualTo("Sạp của bạn đã được duyệt");
        assertThat(p.message()).contains("Cô Tư");
        assertThat(p.link()).isEqualTo("/farmer");
        assertThat(p.persistent()).isTrue();
        assertThat(p.unreadCount()).isEqualTo(3L);
        assertThat(p.alert()).isEqualTo(new Alert(true, false, true));
        assertThat(p.createdAt()).isEqualTo(Instant.parse("2026-09-25T04:59:59Z"));
        assertThat(p.conversationId()).isNull();
    }

    @Test
    void aRecipientWithoutSettingsGetsEnglish() {
        when(userSettings.findAllById(List.of(7L))).thenReturn(List.of());
        when(notifications.save(any())).thenAnswer(i -> i.getArgument(0));
        when(prefs.alertFor(anyLong(), any(), any())).thenReturn(new Alert(true, true, true));

        service.dispatch(
                List.of(7L),
                NotificationEvent.of(
                        NotificationKind.FARMER_APPROVED, "/farmer", Map.of("stall", "S")));

        verify(delivery).deliver(eq(7L), argThat(p -> p.title().equals("Your stall is approved")));
    }

    @Test
    void aMessageIsPushedButNeverSaved() {
        when(userSettings.findAllById(List.of(8L))).thenReturn(List.of());
        when(notifications.countByUserIdAndReadFalse(8L)).thenReturn(2L);
        when(prefs.alertFor(eq(8L), eq(NotificationKind.MESSAGE), any()))
                .thenReturn(new Alert(true, true, true));

        service.dispatch(
                List.of(8L),
                new NotificationEvent(
                        NotificationKind.MESSAGE,
                        Map.of(),
                        "/messages?c=5",
                        5L,
                        "Cô Tư",
                        "Còn xoài không?"));

        verify(notifications, never()).save(any());
        ArgumentCaptor<NotificationPayload> sent =
                ArgumentCaptor.forClass(NotificationPayload.class);
        verify(delivery).deliver(eq(8L), sent.capture());
        assertThat(sent.getValue().id()).isNull();
        assertThat(sent.getValue().persistent()).isFalse();
        assertThat(sent.getValue().conversationId()).isEqualTo(5L);
        assertThat(sent.getValue().message()).isEqualTo("Còn xoài không?");
        assertThat(sent.getValue().createdAt()).isEqualTo(clock.instant());
        assertThat(sent.getValue().unreadCount()).isEqualTo(2L);
    }

    @Test
    void aDuplicateRecipientIsNotifiedOnce() {
        when(userSettings.findAllById(any())).thenReturn(List.of());
        when(notifications.save(any())).thenAnswer(i -> i.getArgument(0));
        when(prefs.alertFor(anyLong(), any(), any())).thenReturn(new Alert(true, true, true));

        service.dispatch(
                List.of(3L, 3L),
                NotificationEvent.of(
                        NotificationKind.FARMER_APPLICATION,
                        "/admin/farmers/1",
                        Map.of("stall", "S")));

        verify(notifications, times(1)).save(any());
        verify(delivery, times(1)).deliver(eq(3L), any());
    }

    @Test
    void aFailingDeliveryDoesNotStopTheOthers() {
        when(userSettings.findAllById(any())).thenReturn(List.of());
        when(notifications.save(any())).thenAnswer(i -> i.getArgument(0));
        when(prefs.alertFor(anyLong(), any(), any())).thenReturn(new Alert(true, true, true));
        doThrow(new RuntimeException("boom")).when(delivery).deliver(eq(1L), any());

        service.dispatch(
                List.of(1L, 2L),
                NotificationEvent.of(
                        NotificationKind.FARMER_APPLICATION,
                        "/admin/farmers/3",
                        Map.of("stall", "S")));

        verify(delivery).deliver(eq(2L), any());
    }

    @Test
    void notifyAdminsReachesEveryActiveAdmin() {
        when(notifications.activeAdminIds()).thenReturn(List.of(1L, 2L));
        when(userSettings.findAllById(any())).thenReturn(List.of());
        when(notifications.save(any())).thenAnswer(i -> i.getArgument(0));
        when(prefs.alertFor(anyLong(), any(), any())).thenReturn(new Alert(true, true, true));

        service.notifyAdmins(
                NotificationEvent.of(
                        NotificationKind.FARMER_APPLICATION,
                        "/admin/farmers/3",
                        Map.of("stall", "S")));

        verify(delivery).deliver(eq(1L), any());
        verify(delivery).deliver(eq(2L), any());
    }
}
