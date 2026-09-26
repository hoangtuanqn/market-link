package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportDetailResource;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.resources.ModeratedMessageResource;
import com.techx.intervue.resources.PageResource;

/**
 * Spec §8.3. Deliberately NO method takes a conversationId: everything an admin can read starts
 * from a report. Adding such a method would break this feature's privacy policy.
 */
public interface ModerationServiceInterface {

    /** Moderation queue. status null = every status. */
    PageResource<AdminReportListItemResource> list(ReportStatus status, int page, int pageSize);

    /**
     * Spec §8.3: the reported message + up to 5 messages on each side. The only entry point is
     * reportId.
     */
    AdminReportDetailResource detail(Long reportId);

    /** Soft hide; only allowed when the message already has a report (spec §8.3). Idempotent. */
    ModeratedMessageResource hide(Long adminId, Long messageId);

    /**
     * An admin looked and decided not to hide — the report moves to reviewed to leave the queue.
     */
    MessageReportResource dismiss(Long adminId, Long reportId);
}
