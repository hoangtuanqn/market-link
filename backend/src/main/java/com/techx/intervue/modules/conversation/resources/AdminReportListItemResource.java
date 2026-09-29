package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

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
