package com.techx.intervue.modules.report.services.interfaces;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;

/** FR-068/069 — the stall's own numbers; {@code userId} is the signed-in Farmer. */
public interface FarmerReportServiceInterface {

    FarmerDashboardResource dashboard(long userId);

    List<BestSellerResource> bestSellers(long userId, LocalDate from, LocalDate to, int limit);

    PageResource<OrderListItemResource> salesHistory(
            long userId, LocalDate from, LocalDate to, int page, int pageSize);
}
