package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import java.time.Instant;

/**
 * One message in the admin's context window. An image only shows up as the `hasPhoto` flag; the
 * image bytes go through GET /api/v1/attachments/{id}, which does its own permission check.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ModeratedMessageResource(
        Long id,
        Long senderId,
        String senderName,
        MessageKind kind,
        String body,
        boolean hasPhoto,
        // Only present for a message that HAS been reported — exactly the messages readAsAdmin lets
        // open (spec §8.3)
        Long attachmentId,
        boolean reported,
        boolean hidden,
        Instant createdAt) {}
