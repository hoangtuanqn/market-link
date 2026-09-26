package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.resources.NotificationPayload;

/**
 * The route that carries a frame to the recipient. N1: STOMP; N3 wraps Web Push around it for
 * offline people.
 */
public interface NotificationDeliveryInterface {
    void deliver(Long userId, NotificationPayload payload);
}
