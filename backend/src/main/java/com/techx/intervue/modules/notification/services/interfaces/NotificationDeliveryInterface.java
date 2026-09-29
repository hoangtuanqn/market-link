package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.resources.NotificationPayload;

public interface NotificationDeliveryInterface {
    void deliver(Long userId, NotificationPayload payload);
}
