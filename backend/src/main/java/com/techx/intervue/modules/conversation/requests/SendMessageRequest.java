package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        MessageKind kind,
        @Size(max = 2000, message = "A message can be at most 2000 characters.") String body,
        Long productId,
        Long orderId,
        Long attachmentId) {}
