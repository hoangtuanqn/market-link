package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductDetailRow;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.services.interfaces.ProductQueryServiceInterface;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.modules.stall.resources.OperatingDayResource;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.resources.StallMarketResource;
import com.techx.intervue.modules.stall.resources.StallSummaryResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ProductQueryService implements ProductQueryServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final ProductQueryRepository repository;
    private final StallServiceInterface stallService;
    private final ProductAvailabilityResolver availability;

    @Override
    public PageResource<ProductListItemResource> search(ProductSearchCriteria criteria) {
        int page = Math.max(1, criteria.page());
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, criteria.pageSize()));
        BigDecimal min = criteria.minPrice();
        BigDecimal max = criteria.maxPrice();
        // If the customer drags the two ends of the price bar the wrong way round they still get
        // results, not a hard-to-understand
        // empty list
        if (min != null && max != null && min.compareTo(max) > 0) {
            BigDecimal swap = min;
            min = max;
            max = swap;
        }
        PageResource<ProductListItemResource> page1 =
                repository.search(
                        criteria.withPrices(min, max),
                        ProductQueryRepository.orderBy(criteria.sort()),
                        (page - 1) * size,
                        size);
        List<ProductListItemResource> overlaid = overlayAvailability(page1.items());
        return new PageResource<>(overlaid, page1.page(), page1.pageSize(), overlaid.size());
    }

    @Override
    public ProductDetailResource detail(long id) {
        ProductDetailRow row =
                repository.findVisibleById(id).orElseThrow(() -> new ProductNotFoundException(id));
        List<ProductListItemResource> overlaid = overlayAvailability(List.of(row.item()));
        if (overlaid.isEmpty()) {
            throw new ProductNotFoundException(id);
        }
        StallSummaryResource farmer = summarize(stallService.publicDetail(row.item().farmerId()));
        // reviewsSummary has real numbers from cluster C8; today it is the shape with 0 values.
        return new ProductDetailResource(
                overlaid.getFirst(), row.description(), farmer, ReviewSummaryResource.empty());
    }

    /**
     * Replaces stockQuantity/price read straight from products with the numbers for the nearest
     * orderable pickup date. A product with no orderable date (no active weekly template covers any
     * of the next 14 days) is dropped from the results — matches the decision that a product with
     * no template is never orderable, on any date.
     */
    private List<ProductListItemResource> overlayAvailability(List<ProductListItemResource> items) {
        Map<Long, BigDecimal> basePrices =
                items.stream()
                        .collect(
                                Collectors.toMap(
                                        ProductListItemResource::id,
                                        ProductListItemResource::price));
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                availability.resolve(basePrices);
        return items.stream()
                .filter(i -> resolved.containsKey(i.id()))
                .map(
                        i -> {
                            ProductAvailabilityResolver.Availability a = resolved.get(i.id());
                            return i.withAvailability(a.quantity(), a.price());
                        })
                .toList();
    }

    @Override
    public PageResource<ProductListItemResource> byFarmer(
            long farmerId, Integer day, int page, int pageSize) {
        return search(
                new ProductSearchCriteria(
                        null, null, null, farmerId, day, null, null, "newest", page, pageSize));
    }

    /**
     * A compact stall for the product page: the booth and time window come from the first market,
     * the days merge every market.
     */
    private static StallSummaryResource summarize(StallDetailResource s) {
        StallMarketResource first = s.markets().isEmpty() ? null : s.markets().get(0);
        List<Integer> days =
                s.markets().stream()
                        .flatMap(m -> m.operatingDays().stream())
                        .map(OperatingDayResource::dayOfWeek)
                        .distinct()
                        .sorted()
                        .toList();
        OperatingDayResource window =
                first == null || first.operatingDays().isEmpty()
                        ? null
                        : first.operatingDays().get(0);
        return new StallSummaryResource(
                s.farmerId(),
                s.stallName(),
                s.contactPerson(),
                s.logoUrl(),
                first == null ? null : first.stallCode(),
                first == null ? null : first.stallLatitude(),
                first == null ? null : first.stallLongitude(),
                s.ratingAvg(),
                s.ratingCount(),
                days,
                window == null ? null : window.pickupStartTime(),
                window == null ? null : window.pickupEndTime());
    }
}
