package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;
import java.util.List;

/**
 * Spec §8.3. `context` là tin bị báo cáo cùng tối đa 5 tin mỗi bên, xếp theo id tăng dần. Đây là
 * TOÀN BỘ những gì admin đọc được trong thread đó.
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
