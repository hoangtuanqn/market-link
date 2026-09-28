package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;

public interface FarmerQualityReportServiceInterface {

    /** The reports about the caller's own stall, newest first, with its strikes. */
    FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize);

    /** Writes or replaces the stall's reply while the report is open (spec §4.4.2). */
    QualityReportResource respond(long farmerUserId, long reportId, String response);
}
