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
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class ProductQueryService implements ProductQueryServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final ProductQueryRepository repository;
    private final StallServiceInterface stallService;

    @Override
    public PageResource<ProductListItemResource> search(ProductSearchCriteria criteria) {
        int page = Math.max(1, criteria.page());
        int size = Math.min(MAX_PAGE_SIZE, Math.max(1, criteria.pageSize()));
        BigDecimal min = criteria.minPrice();
        BigDecimal max = criteria.maxPrice();
        // Khách kéo hai đầu thanh giá ngược nhau thì vẫn ra kết quả, không phải danh sách rỗng khó
        // hiểu
        if (min != null && max != null && min.compareTo(max) > 0) {
            BigDecimal swap = min;
            min = max;
            max = swap;
        }
        return repository.search(
                criteria.withPrices(min, max),
                ProductQueryRepository.orderBy(criteria.sort()),
                (page - 1) * size,
                size);
    }

    @Override
    public ProductDetailResource detail(long id) {
        ProductDetailRow row =
                repository.findVisibleById(id).orElseThrow(() -> new ProductNotFoundException(id));
        StallSummaryResource farmer = summarize(stallService.publicDetail(row.item().farmerId()));
        // reviewsSummary có số thật từ cụm C8; hôm nay là hình dạng với số 0.
        return new ProductDetailResource(
                row.item(), row.description(), farmer, ReviewSummaryResource.empty());
    }

    @Override
    public PageResource<ProductListItemResource> byFarmer(
            long farmerId, Integer day, int page, int pageSize) {
        return search(
                new ProductSearchCriteria(
                        null, null, null, farmerId, day, null, null, "newest", page, pageSize));
    }

    /** Stall gọn cho trang sản phẩm: quầy và khung giờ lấy ở chợ đầu tiên, ngày gộp mọi chợ. */
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
