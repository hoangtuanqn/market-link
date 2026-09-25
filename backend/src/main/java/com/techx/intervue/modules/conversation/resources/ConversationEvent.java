package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

/**
 * Đẩy tới /user/queue/conversations. type: "updated" (tin mới / preview / unread) hoặc "read".
 * unreadCount là Long để sự kiện "read" không mang số 0 giả — FE chỉ cập nhật badge khi trường có
 * mặt.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationEvent(
        String type,
        Long conversationId,
        String lastMessageText,
        Instant lastMessageAt,
        Long unreadCount,
        Long readerId,
        Instant readAt) {
    public static final String UPDATED = "updated";
    public static final String READ = "read";
}
