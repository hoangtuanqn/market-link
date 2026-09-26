package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;
import java.util.List;

/**
 * Spec §8.3. `context` is the reported message plus up to 5 messages on each side, in ascending id
 * order. This is EVERYTHING an admin can read in that thread.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record AdminReportDetailResource(
        Long reportId,
        Long messageId,
        Long conversationId,
        ReportReason reason,
        String note,
        ReportStatus status,
        String reporterName,
        Instant reportedAt,
        List<ModeratedMessageResource> context) {}
