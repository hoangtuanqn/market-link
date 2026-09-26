package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.Builder;

/**
 * Đẩy tới /user/topic/conversations. type: "updated" (tin mới / preview / unread), "read", hoặc
 * "hidden" (FR-116). messageId chỉ có mặt ở sự kiện "hidden". unreadCount là Long để sự kiện "read"
 * không mang số 0 giả — FE chỉ cập nhật badge khi trường có mặt.
 */
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationEvent(
        String type,
        Long conversationId,
        Long messageId,
        String lastMessageText,
        Instant lastMessageAt,
        Long unreadCount,
        Long readerId,
        Instant readAt) {
    public static final String UPDATED = "updated";
    public static final String READ = "read";

    /** FR-116: admin đã ẩn một tin; client bỏ nó khỏi thread mà không cần tải lại. */
    public static final String HIDDEN = "hidden";
}
