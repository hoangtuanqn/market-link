package com.techx.intervue.modules.chat.resources;

import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.requests.ChatRequest.PageContext;
import java.util.List;

public record AssistantContext(
        AssistantAudience audience, Long userId, Long farmerId, List<PageContext.CartLine> cart) {

    public AssistantContext(AssistantAudience audience, Long userId, Long farmerId) {
        this(audience, userId, farmerId, List.of());
    }
}
