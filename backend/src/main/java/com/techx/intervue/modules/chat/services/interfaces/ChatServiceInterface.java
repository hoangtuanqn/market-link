package com.techx.intervue.modules.chat.services.interfaces;

import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.FarmerBriefingResource;
import java.util.List;

public interface ChatServiceInterface {
    default ChatReplyResource reply(ChatRequest request, Long userId) {
        return reply(request, userId, null);
    }

    ChatReplyResource reply(ChatRequest request, Long userId, AssistantAudience audience);

    List<ChatMessageResource> history(String sessionKey, Long userId);

    FarmerBriefingResource farmerBriefing(Long userId);
}
