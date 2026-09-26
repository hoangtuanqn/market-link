package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

/**
 * Một dòng trong hàng đợi kiểm duyệt. Chỉ có `preview` chứ không có toàn văn: hàng đợi là nơi admin
 * quyết định có mở ra xem không, không phải nơi đọc hàng loạt (spec §8.3).
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
