package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;

public interface FarmerQualityReportServiceInterface {

    FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize);

    QualityReportResource respond(long farmerUserId, long reportId, String response);
}
