package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;
import java.util.List;

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
