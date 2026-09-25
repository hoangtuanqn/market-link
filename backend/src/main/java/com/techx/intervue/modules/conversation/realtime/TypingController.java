package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
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

    @MessageMapping("/typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        Long me = Long.parseLong(principal.getName());
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
