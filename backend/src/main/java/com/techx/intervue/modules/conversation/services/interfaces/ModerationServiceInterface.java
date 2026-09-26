package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.enums.ReportStatus;
import com.techx.intervue.modules.conversation.resources.AdminReportDetailResource;
import com.techx.intervue.modules.conversation.resources.AdminReportListItemResource;
import com.techx.intervue.resources.PageResource;

/**
 * Spec §8.3. Cố ý KHÔNG có method nào nhận conversationId: mọi thứ admin đọc được đều bắt đầu từ
 * một báo cáo. Thêm một method như vậy là phá chính sách riêng tư của tính năng này.
 */
public interface ModerationServiceInterface {

    /** Hàng đợi kiểm duyệt. status null = mọi trạng thái. */
    PageResource<AdminReportListItemResource> list(ReportStatus status, int page, int pageSize);

    /** Spec §8.3: tin bị báo cáo + tối đa 5 tin mỗi bên. Cửa vào duy nhất là reportId. */
    AdminReportDetailResource detail(Long reportId);
}
