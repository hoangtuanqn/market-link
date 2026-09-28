package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;

public interface CustomerQualityReportServiceInterface {

    /** FR-122: the buyer reports one spoiled line of a completed order (spec §4.4.1). */
    ItemQualityReportResource report(
            long userId, long orderId, long itemId, CreateQualityReportRequest request);
}
