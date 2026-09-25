package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * FR-110, FR-114. kind bỏ trống = text. Plan 1 chỉ nhận text, nên body bắt buộc; Plan 3 nới cho
 * ảnh. productId / orderId là ngữ cảnh ghim, chưa kiểm tồn tại vì hai bảng đó chưa có.
 */
public record SendMessageRequest(
        MessageKind kind,
        @NotBlank(message = "Type a message before sending.")
                @Size(max = 2000, message = "A message can be at most 2000 characters.")
                String body,
        Long productId,
        Long orderId) {}
