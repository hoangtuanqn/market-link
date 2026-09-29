package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ModeratedMessageResource(
        Long id,
        Long senderId,
        String senderName,
        MessageKind kind,
        String body,
        boolean hasPhoto,
        boolean hasVideo,
        Long attachmentId,
        boolean reported,
        boolean hidden,
        Instant createdAt) {}
