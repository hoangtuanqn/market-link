package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import jakarta.persistence.EntityNotFoundException;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * FR-112. Sự kiện tạm, không chạm DB (spec 7.1). Không phải thành viên hoặc thread không tồn tại →
 * im lặng: không có gì để "lộ" cho người đoán id.
 */
@Controller
@RequiredArgsConstructor
public class TypingController {

    public record TypingRequest(Long conversationId, boolean typing) {}

    public record TypingEvent(Long conversationId, Long userId, boolean typing) {}

    private final ConversationLookup lookup;
    private final StompChatEventPublisher publisher;
    private final ChatRateLimiterInterface rateLimiter;

    @MessageMapping("/typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        // Frame bịa hoặc client bug: không có gì để làm, và cũng không có mã lỗi nào để trả —
        // STOMP không phải HTTP (spec §7.1). Im lặng bỏ qua thay vì đổ stack trace vào log.
        if (request == null || request.conversationId() == null) {
            return;
        }
        Long me = Long.parseLong(principal.getName());
        try {
            rateLimiter.check(me, ChatRateLimiterInterface.Action.TYPING);
        } catch (RateLimitedException e) {
            // Rải frame liên tục: bỏ im lặng, và bỏ TRƯỚC khi chạm DB
            return;
        }
        Conversation conversation;
        try {
            conversation = lookup.requireMember(me, request.conversationId());
        } catch (EntityNotFoundException | ConversationAccessDeniedException e) {
            return;
        }
        publisher.send(
                conversation.otherMember(me),
                StompChatEventPublisher.TYPING,
                new TypingEvent(conversation.getId(), me, request.typing()));
    }
}
