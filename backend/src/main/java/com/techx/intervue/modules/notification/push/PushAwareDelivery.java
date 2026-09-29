package com.techx.intervue.modules.notification.push;

import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.conversation.realtime.PresenceService.PresenceInfo;
import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.services.impl.StompNotificationDelivery;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import java.util.List;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Primary
@Component
public class PushAwareDelivery implements NotificationDeliveryInterface {

    private final StompNotificationDelivery stomp;
    private final WebPushSender push;
    private final PresenceService presence;

    public PushAwareDelivery(
            StompNotificationDelivery stomp, WebPushSender push, PresenceService presence) {
        this.stomp = stomp;
        this.push = push;
        this.presence = presence;
    }

    @Override
    public void deliver(Long userId, NotificationPayload payload) {
        stomp.deliver(userId, payload);
        if (!push.enabled() || !payload.alert().browser()) return;
        PresenceInfo info = presence.snapshot(List.of(userId)).get(userId);
        if (info == null || !info.online()) {
            push.send(userId, payload);
        }
    }
}
