package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.Size;

/**
 * FR-110, FR-114, FR-115. kind left empty = text.
 *
 * <p>body is no longer @NotBlank because an image message has no text: "there must be something to
 * send" is a business rule that depends on kind, so MessageService decides (text needs body, image
 * needs attachmentId) and still returns 400 through EmptyMessageException — the HTTP code is
 * unchanged from before.
 */
public record SendMessageRequest(
        MessageKind kind,
        @Size(max = 2000, message = "A message can be at most 2000 characters.") String body,
        Long productId,
        Long orderId,
        Long attachmentId) {}
