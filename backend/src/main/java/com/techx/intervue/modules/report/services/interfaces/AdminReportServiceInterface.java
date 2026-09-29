package com.techx.intervue.modules.report.services.interfaces;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.resources.AdminDashboardResource;
import com.techx.intervue.modules.report.resources.RevenueByMarketResource;
import com.techx.intervue.modules.report.resources.TopFarmerResource;
import com.techx.intervue.modules.report.resources.TopProductResource;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;

public interface AdminReportServiceInterface {

    AdminDashboardResource dashboard();

    List<RevenueByMarketResource> revenueByMarket(LocalDate from, LocalDate to);

    List<TopFarmerResource> topFarmers(LocalDate from, LocalDate to, int limit);

    PageResource<OrderListItemResource> orders(
            LocalDate from,
            LocalDate to,
            Long marketId,
            String status,
            Long customerId,
            int page,
            int pageSize);

    List<TopProductResource> topProducts(LocalDate from, LocalDate to, int limit);
}
