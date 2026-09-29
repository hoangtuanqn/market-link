package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportDetailResource;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.modules.conversation.resources.MessageReportResource;
import com.techx.intervue.modules.conversation.resources.ModeratedMessageResource;
import com.techx.intervue.resources.PageResource;

public interface ModerationServiceInterface {

    PageResource<AdminReportListItemResource> list(ReportStatus status, int page, int pageSize);

    AdminReportDetailResource detail(Long reportId);

    ModeratedMessageResource hide(Long adminId, Long messageId);

    MessageReportResource dismiss(Long adminId, Long reportId);
}
