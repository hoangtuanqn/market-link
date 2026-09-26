package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.resources.NotificationPayload;

/** Đường đưa một khung tới người nhận. N1: STOMP; N3 bọc thêm Web Push cho người offline. */
public interface NotificationDeliveryInterface {
    void deliver(Long userId, NotificationPayload payload);
}
