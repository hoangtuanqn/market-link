package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.requests.ProductSearchCriteria;
import com.techx.intervue.modules.product.resources.ProductDetailRow;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.review.resources.ReviewSummaryResource;
import com.techx.intervue.modules.review.services.interfaces.ReviewServiceInterface;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductQueryServiceTest {

    private ProductQueryRepository repository;
    private StallServiceInterface stallService;
    private ReviewServiceInterface reviewService;
    private ProductQueryService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductQueryRepository.class);
        stallService = mock(StallServiceInterface.class);
        reviewService = mock(ReviewServiceInterface.class);
        service = new ProductQueryService(repository, stallService, reviewService);
        when(repository.search(any(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResource<ProductListItemResource>(List.of(), 1, 12, 0));
    }

    private static ProductSearchCriteria criteria(
            String sort, BigDecimal min, BigDecimal max, int pageSize) {
        return new ProductSearchCriteria(null, null, null, null, null, min, max, sort, 1, pageSize);
    }

    /**
     * `sort` from the query string goes through the whitelist, never concatenated straight into
     * ORDER BY (R-04).
     */
    @Test
    void searchMapsSortPriceAscToOrderByPrice() {
        service.search(criteria("price_asc", null, null, 12));

        verify(repository).search(any(), eq("p.price ASC"), eq(0), eq(12));
        assertThat(ProductQueryRepository.orderBy("price_desc")).isEqualTo("p.price DESC");
        assertThat(ProductQueryRepository.orderBy("newest")).isEqualTo("p.created_at DESC");
        assertThat(ProductQueryRepository.orderBy("rating")).isEqualTo("p.rating_avg DESC");
    }

    @Test
    void searchRejectsUnknownSortBySilentlyUsingNewest() {
        service.search(criteria("'; DROP TABLE products; --", null, null, 12));

        verify(repository).search(any(), eq("p.created_at DESC"), eq(0), eq(12));
    }

    @Test
    void searchSwapsMinAndMaxPriceWhenReversed() {
        service.search(criteria("newest", new BigDecimal("50000"), new BigDecimal("10000"), 12));

        ArgumentCaptor<ProductSearchCriteria> captor =
                ArgumentCaptor.forClass(ProductSearchCriteria.class);
        verify(repository).search(captor.capture(), anyString(), anyInt(), anyInt());
        assertThat(captor.getValue().minPrice()).isEqualByComparingTo("10000");
        assertThat(captor.getValue().maxPrice()).isEqualByComparingTo("50000");
    }

    @Test
    void searchClampsPageSizeToFifty() {
        service.search(criteria("newest", null, null, 999));

        verify(repository).search(any(), anyString(), eq(0), eq(50));
    }

    @Test
    void detailOnMissingProductThrows() {
        when(repository.findVisibleById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(9L)).isInstanceOf(ProductNotFoundException.class);
    }

    /**
     * A soft-deleted product does not pass the public filter; the service has no path that returns
     * stale data.
     */
    @Test
    void detailOnDeletedProductThrows() {
        assertThat(ProductQueryRepository.DETAIL_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
        when(repository.findVisibleById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(5L)).isInstanceOf(ProductNotFoundException.class);
    }

    /**
     * C8 (FR-052): `reviewsSummary` is the real average and histogram, no longer the C3
     * placeholder.
     */
    @Test
    void detailCarriesTheReviewSummaryOfTheProduct() {
        ProductListItemResource item =
                new ProductListItemResource(
                        5L,
                        "Rau muống",
                        10L,
                        "Vườn Út Hiền",
                        2L,
                        "Chợ Bà Chiểu",
                        1L,
                        "Vegetables",
                        new BigDecimal("15000"),
                        "kg",
                        9,
                        null,
                        "available",
                        new BigDecimal("4.50"),
                        2,
                        7);
        when(repository.findVisibleById(5L))
                .thenReturn(Optional.of(new ProductDetailRow(item, "d")));
        when(stallService.publicDetail(10L))
                .thenReturn(
                        new StallDetailResource(
                                10L,
                                "Vườn Út Hiền",
                                "Út Hiền",
                                null,
                                null,
                                12,
                                new BigDecimal("4.50"),
                                2,
                                "approved",
                                List.of()));
        ReviewSummaryResource summary =
                new ReviewSummaryResource(new BigDecimal("4.50"), 2, List.of(0, 0, 0, 1, 1));
        when(reviewService.productSummary(5L)).thenReturn(summary);

        assertThat(service.detail(5L).reviewsSummary()).isSameAs(summary);
    }
}
