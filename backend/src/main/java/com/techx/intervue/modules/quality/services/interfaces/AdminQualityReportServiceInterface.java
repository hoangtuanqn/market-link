package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;

public interface AdminQualityReportServiceInterface {

    /** Status open, confirmed, dismissed or decided (Ruling 6); escalated null = any. */
    PageResource<QualityReportResource> list(
            String status, Boolean escalated, int page, int pageSize);

    /** Spec §4.4.3 "Xác nhận vi phạm": the note is optional. */
    QualityReportResource confirm(long adminId, long reportId, String note);

    /** Spec §4.4.3 "Không phải lỗi sạp": the note is required. */
    QualityReportResource dismiss(long adminId, long reportId, String note);
}
