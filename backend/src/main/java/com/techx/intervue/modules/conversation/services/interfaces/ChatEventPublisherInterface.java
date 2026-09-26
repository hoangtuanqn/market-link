package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.time.Instant;

/**
 * Spec 7.5: service nghiệp vụ chỉ nói "có tin mới" / "đã đọc"; ai nhận và qua đường nào là việc của
 * bản cài đặt. Plan 1 chỉ ghi log; Plan 2 thay bằng STOMP qua RabbitMQ mà không sửa service.
 */
public interface ChatEventPublisherInterface {

    void messageCreated(Conversation conversation, MessageResource message);

    void conversationRead(Conversation conversation, Long readerId, Instant readAt);

    /** FR-116: admin ẩn một tin; cả hai người trong thread bỏ nó khỏi màn hình ngay. */
    void messageHidden(Conversation conversation, Long messageId);
}
