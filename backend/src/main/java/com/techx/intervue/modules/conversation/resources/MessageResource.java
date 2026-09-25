package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import java.time.Instant;
import lombok.Builder;

@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageResource(
        Long id,
        Long conversationId,
        Long senderId,
        MessageKind kind,
        String body,
        Long productId,
        Long orderId,
        AttachmentResource attachment,
        Instant createdAt) {

    public static MessageResource from(Message m) {
        return from(m, null);
    }

    public static MessageResource from(Message m, MessageAttachment attachment) {
        return MessageResource.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderId(m.getSenderId())
                .kind(m.getKind())
                .body(m.getBody())
                .productId(m.getProductId())
                .orderId(m.getOrderId())
                .attachment(
                        attachment == null
                                ? null
                                : AttachmentResource.of(
                                        attachment.getId(),
                                        attachment.getWidth(),
                                        attachment.getHeight()))
                .createdAt(m.getCreatedAt())
                .build();
    }
}
