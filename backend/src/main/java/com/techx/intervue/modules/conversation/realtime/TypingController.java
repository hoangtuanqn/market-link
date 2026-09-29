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
        if (request == null || request.conversationId() == null) {
            return;
        }
        Long me = Long.parseLong(principal.getName());
        try {
            rateLimiter.check(me, ChatRateLimiterInterface.Action.TYPING);
        } catch (RateLimitedException e) {
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
