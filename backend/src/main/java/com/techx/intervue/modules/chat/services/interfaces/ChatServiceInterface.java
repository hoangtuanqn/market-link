package com.techx.intervue.modules.chat.services.interfaces;

import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.FarmerBriefingResource;
import java.util.List;

public interface ChatServiceInterface {
    /** Keyword engine only: guests, and callers that may not use the Claude assistant. */
    default ChatReplyResource reply(ChatRequest request, Long userId) {
        return reply(request, userId, null);
    }

    /**
     * @param audience which assistant the caller gets (FR-090, FR-093, FR-094), resolved from the
     *     authenticated principal. Null means the keyword engine answers: a guest, or an account
     *     holding none of the three roles.
     */
    ChatReplyResource reply(ChatRequest request, Long userId, AssistantAudience audience);

    List<ChatMessageResource> history(String sessionKey, Long userId);

    /** FR-093: the Overview banner for the signed-in Farmer, for today in Vietnam time. */
    FarmerBriefingResource farmerBriefing(Long userId);
}
