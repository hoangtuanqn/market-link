package com.techx.intervue.modules.report.services.impl;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.impl.StallSuspensionMessage;
import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.report.repositories.FarmerReportRepository;
import com.techx.intervue.modules.report.resources.BestSellerResource;
import com.techx.intervue.modules.report.resources.FarmerDashboardResource;
import com.techx.intervue.modules.report.services.interfaces.FarmerReportServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class FarmerReportService implements FarmerReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MAX_LIMIT = 20;

    private final FarmerProfileRepository farmerRepository;
    private final FarmerReportRepository reports;
    private final Clock clock;
    private final ProductRepository products;
    private final ProductAvailabilityResolver availability;

    @Override
    @Transactional(readOnly = true)
    public FarmerDashboardResource dashboard(long userId) {
        StallSuspensionMessage.assertUsable(
                farmerRepository
                        .findByUserId(userId)
                        .orElseThrow(FarmerProfileNotFoundException::new));
        LocalDate monthStart = LocalDate.now(clock).withDayOfMonth(1);
        long farmerId = stallOf(userId);
        return reports.dashboard(farmerId, monthStart).withLowStockCount(lowStockCount(farmerId));
    }

    private long lowStockCount(long farmerId) {
        Map<Long, BigDecimal> prices =
                products.findByFarmerIdAndDeletedFalse(farmerId).stream()
                        .filter(p -> p.getStatus() == ProductStatus.AVAILABLE)
                        .collect(Collectors.toMap(Product::getId, Product::getPrice));
        Map<Long, ProductAvailabilityResolver.Availability> resolved = availability.resolve(prices);
        return prices.keySet().stream()
                .filter(
                        id ->
                                !resolved.containsKey(id)
                                        || resolved.get(id).quantity()
                                                <= FarmerReportRepository.LOW_STOCK)
                .count();
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
