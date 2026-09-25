package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Đẩy tới mọi tab đang mở của người nhận; offline thì broker bỏ qua (thông báo đã nằm trong DB).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StompNotificationDelivery implements NotificationDeliveryInterface {

    /**
     * /topic thay /queue: cùng lý do như StompChatEventPublisher (queue auto-delete trên RabbitMQ).
     */
    public static final String DESTINATION = "/topic/notifications";

    private final SimpMessagingTemplate template;

    @Override
    public void deliver(Long userId, NotificationPayload payload) {
        try {
            template.convertAndSendToUser(String.valueOf(userId), DESTINATION, payload);
        } catch (MessagingException e) {
            log.warn("Could not push notification to user {}: {}", userId, e.getMessage());
        }
    }
}
