package com.techx.intervue.modules.report.services.impl;

import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.repositories.FarmerReportRepository;
import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.modules.report.services.interfaces.FarmerReportServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-068/069. The stall is resolved from the caller's token, never from a request id (R-06). */
@Service
@AllArgsConstructor
public class FarmerReportService implements FarmerReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_LIMIT = 20;

    private final FarmerProfileRepository farmerRepository;
    private final FarmerReportRepository reports;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public FarmerDashboardResource dashboard(long userId) {
        LocalDate monthStart = LocalDate.now(clock).withDayOfMonth(1);
        return reports.dashboard(stallOf(userId), monthStart);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BestSellerResource> bestSellers(
            long userId, LocalDate from, LocalDate to, int limit) {
        return reports.bestSellers(
                stallOf(userId), from, to, Math.min(MAX_LIMIT, Math.max(1, limit)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<OrderListItemResource> salesHistory(
            long userId, LocalDate from, LocalDate to, int page, int pageSize) {
        return reports.sales(
                stallOf(userId),
                from,
                to,
                Math.max(1, page),
                Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize)));
    }

    private long stallOf(long userId) {
        return farmerRepository
                .findByUserId(userId)
                .orElseThrow(() -> new AccessDeniedException("No stall for this account."))
                .getId();
    }
}
