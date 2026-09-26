package com.techx.intervue.modules.conversation.requests;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.validation.constraints.Size;

/**
 * FR-110, FR-114, FR-115. kind bỏ trống = text.
 *
 * <p>body không còn @NotBlank vì tin ảnh không có chữ: "phải có gì đó để gửi" là luật nghiệp vụ phụ
 * thuộc kind, nên MessageService quyết (text cần body, image cần attachmentId) và vẫn trả 400 qua
 * EmptyMessageException — mã HTTP không đổi so với trước.
 */
public record SendMessageRequest(
        MessageKind kind,
        @Size(max = 2000, message = "A message can be at most 2000 characters.") String body,
        Long productId,
        Long orderId,
        Long attachmentId) {}
