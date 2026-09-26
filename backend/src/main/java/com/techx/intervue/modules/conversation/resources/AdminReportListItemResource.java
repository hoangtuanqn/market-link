package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

/**
 * One row in the moderation queue. It only has a `preview`, not the full text: the queue is where
 * the admin decides whether to open it, not a place for bulk reading (spec §8.3).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportListItemResource(
        Long reportId,
        Long messageId,
        Long conversationId,
        ReportReason reason,
        String note,
        ReportStatus status,
        String reporterName,
        String senderName,
        String preview,
        Instant reportedAt) {}
