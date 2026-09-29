package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;

public interface AdminQualityReportServiceInterface {

    PageResource<QualityReportResource> list(
            String status, Boolean escalated, int page, int pageSize);

    QualityReportResource confirm(long adminId, long reportId, String note);

    QualityReportResource dismiss(long adminId, long reportId, String note);
}
