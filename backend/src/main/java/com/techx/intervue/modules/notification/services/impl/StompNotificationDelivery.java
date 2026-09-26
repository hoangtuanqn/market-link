package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.resources.NotificationPayload;
import com.techx.intervue.modules.notification.services.interfaces.NotificationDeliveryInterface;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Push to every open tab of the recipient; when offline the broker skips it (the notification is
 * already in the DB).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StompNotificationDelivery implements NotificationDeliveryInterface {

    /**
     * /topic instead of /queue: same reason as StompChatEventPublisher (auto-delete queues on
     * RabbitMQ).
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
