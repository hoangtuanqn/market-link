package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.resources.MessageResource;

/**
 * Phát sau commit khi có tin mới, cho các module khác (thông báo FR-042) mà không để chat phụ thuộc
 * vào chúng.
 */
public record ChatMessageCreatedEvent(
        Long conversationId, Long recipientId, MessageResource message) {}
