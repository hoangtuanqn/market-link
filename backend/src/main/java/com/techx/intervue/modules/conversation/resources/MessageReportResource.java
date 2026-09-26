package com.techx.intervue.modules.conversation.resources;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.techx.intervue.modules.conversation.entities.MessageReport;
import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
import java.time.Instant;

/** Trả về cho chính người báo. Không mang thông tin của admin (reviewedBy / reviewedAt). */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MessageReportResource(
        Long id,
        Long messageId,
        ReportReason reason,
        String note,
        ReportStatus status,
        Instant createdAt) {

    public static MessageReportResource from(MessageReport r) {
        return new MessageReportResource(
                r.getId(),
                r.getMessageId(),
                r.getReason(),
                r.getNote(),
                r.getStatus(),
                r.getCreatedAt());
    }
}
