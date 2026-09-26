package com.techx.intervue.modules.notification.push;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.conversation.realtime.PresenceService.PresenceInfo;
import com.techx.intervue.modules.notification.resources.Alert;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.services.impl.StompNotificationDelivery;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushAwareDeliveryTest {

    @Mock StompNotificationDelivery stomp;
    @Mock WebPushSender push;
    @Mock PresenceService presence;
    PushAwareDelivery delivery;

    @BeforeEach
    void setUp() {
        delivery = new PushAwareDelivery(stomp, push, presence);
    }

    private static NotificationPayload frame(boolean browser) {
        return new NotificationPayload(
                1L,
                "announcement",
                "t",
                "m",
                "/notifications",
                Instant.now(),
                true,
                1,
                new Alert(true, browser, true),
                null);
    }

    private void online(boolean on) {
        when(presence.snapshot(List.of(7L))).thenReturn(Map.of(7L, new PresenceInfo(on, null)));
    }

    @Test
    void anOnlineUserOnlyGetsStomp() {
        when(push.enabled()).thenReturn(true);
        online(true);
        NotificationPayload f = frame(true);

        delivery.deliver(7L, f);

        verify(stomp).deliver(7L, f);
        verify(push, never()).send(anyLong(), any());
    }

    @Test
    void anOfflineUserAlsoGetsAPush() {
        when(push.enabled()).thenReturn(true);
        online(false);
        NotificationPayload f = frame(true);

        delivery.deliver(7L, f);

        verify(stomp).deliver(7L, f);
        verify(push).send(7L, f);
    }

    @Test
    void theBrowserChannelSwitchedOffMeansNoPush() {
        when(push.enabled()).thenReturn(true);

        delivery.deliver(7L, frame(false));

        verify(push, never()).send(anyLong(), any());
    }

    @Test
    void pushSwitchedOffOnTheServerMeansNoPush() {
        when(push.enabled()).thenReturn(false);

        delivery.deliver(7L, frame(true));

        verify(push, never()).send(anyLong(), any());
    }
}
