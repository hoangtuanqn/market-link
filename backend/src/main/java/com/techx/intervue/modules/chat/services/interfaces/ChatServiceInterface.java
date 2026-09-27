package com.techx.intervue.modules.chat.services.interfaces;

import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import java.util.List;

public interface ChatServiceInterface {
    /** Keyword engine only: guests, and callers that may not use the Claude assistant. */
    default ChatReplyResource reply(ChatRequest request, Long userId) {
        return reply(request, userId, false);
    }

    /**
     * @param assistantAllowed the caller is a signed-in customer-panel account, so Claude may
     *     answer (when configured and under the hourly cap); otherwise the keyword engine answers
     */
    ChatReplyResource reply(ChatRequest request, Long userId, boolean assistantAllowed);

    List<ChatMessageResource> history(String sessionKey, Long userId);
}
