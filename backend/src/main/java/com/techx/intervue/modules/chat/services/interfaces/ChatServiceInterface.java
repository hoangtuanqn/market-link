package com.techx.intervue.modules.chat.services.interfaces;

import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import java.util.List;

public interface ChatServiceInterface {
    ChatReplyResource reply(ChatRequest request, Long userId);

    List<ChatMessageResource> history(String sessionKey, Long userId);
}
