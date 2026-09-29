package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.order.resources.ItemQualityReportResource;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;

public interface CustomerQualityReportServiceInterface {

    ItemQualityReportResource report(
            long userId, long orderId, long itemId, CreateQualityReportRequest request);
}
