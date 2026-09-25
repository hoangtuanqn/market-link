package com.techx.intervue.modules.conversation.requests;

import jakarta.validation.constraints.NotNull;

/** FR-110. Ghim sản phẩm đi theo tin nhắn đầu tiên (SendMessageRequest), không theo thread. */
public record OpenConversationRequest(
        @NotNull(message = "Choose a stall to message.") Long farmerUserId) {}
