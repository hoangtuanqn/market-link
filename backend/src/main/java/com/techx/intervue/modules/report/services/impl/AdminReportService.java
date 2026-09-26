package com.techx.intervue.modules.report.services.impl;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.repositories.AdminReportRepository;
import com.techx.intervue.modules.report.repositories.OrderRows;
import com.techx.intervue.modules.report.resources.AdminDashboardResource;
import com.techx.intervue.modules.report.resources.RevenueByMarketResource;
import com.techx.intervue.modules.report.resources.TopFarmerResource;
import com.techx.intervue.modules.report.services.interfaces.AdminReportServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-070/075. A null {@code from}/{@code to} means all time; a reversed range is swapped. */
@Service
@AllArgsConstructor
public class AdminReportService implements AdminReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_LIMIT = 50;

    private final AdminReportRepository reports;

    @Override
    @Transactional(readOnly = true)
    public AdminDashboardResource dashboard() {
        return reports.dashboard();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RevenueByMarketResource> revenueByMarket(LocalDate from, LocalDate to) {
        LocalDate[] r = ordered(from, to);
        return reports.revenueByMarket(r[0], r[1]);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopFarmerResource> topFarmers(LocalDate from, LocalDate to, int limit) {
        LocalDate[] r = ordered(from, to);
        return reports.topFarmers(r[0], r[1], Math.min(MAX_LIMIT, Math.max(1, limit)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<OrderListItemResource> orders(
            LocalDate from, LocalDate to, Long marketId, String status, int page, int pageSize) {
        LocalDate[] r = ordered(from, to);
        return reports.orders(
                r[0],
                r[1],
                marketId,
                OrderRows.statusOrNull(status),
                Math.max(1, page),
                Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    private static LocalDate[] ordered(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            return new LocalDate[] {to, from};
        }
        return new LocalDate[] {from, to};
    }
}
