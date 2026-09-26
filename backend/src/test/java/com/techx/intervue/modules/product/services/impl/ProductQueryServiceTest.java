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
import com.techx.intervue.modules.product.resources.ProductDetailResource;
import com.techx.intervue.modules.product.resources.ProductDetailRow;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.stall.resources.StallDetailResource;
import com.techx.intervue.modules.stall.services.interfaces.StallServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductQueryServiceTest {

    private ProductQueryRepository repository;
    private StallServiceInterface stallService;
    private ProductAvailabilityResolver availability;
    private ProductQueryService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductQueryRepository.class);
        stallService = mock(StallServiceInterface.class);
        availability = mock(ProductAvailabilityResolver.class);
        service = new ProductQueryService(repository, stallService, availability);
        when(repository.search(any(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResource<ProductListItemResource>(List.of(), 1, 12, 0));
        when(availability.resolve(any())).thenReturn(Map.of());
    }

    private static ProductListItemResource item(long id) {
        return new ProductListItemResource(
                id,
                "Rau muống",
                10L,
                "Vườn Út Hiền",
                null,
                null,
                5L,
                "Vegetables",
                new BigDecimal("12000"),
                "bó",
                40,
                null,
                "available",
                BigDecimal.ZERO,
                0,
                3);
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

    /** search() overwrites stockQuantity/price with the nearest orderable date's numbers. */
    @Test
    void searchOverlaysTheNearestAvailableDateOntoEachItem() {
        ProductListItemResource raw = item(1L);
        when(repository.search(any(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(raw), 1, 20, 1));
        when(availability.resolve(Map.of(1L, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                1L,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 40, new BigDecimal("13000"))));

        PageResource<ProductListItemResource> result =
                service.search(criteria("newest", null, null, 20));

        assertThat(result.items().getFirst().stockQuantity()).isEqualTo(40);
        assertThat(result.items().getFirst().price()).isEqualByComparingTo("13000");
    }

    /** No orderable date within the lookahead → the product is dropped from the results. */
    @Test
    void searchDropsAProductWithNoOrderableDate() {
        ProductListItemResource raw = item(1L);
        when(repository.search(any(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(raw), 1, 20, 1));
        when(availability.resolve(any())).thenReturn(Map.of());

        PageResource<ProductListItemResource> result =
                service.search(criteria("newest", null, null, 20));

        assertThat(result.items()).isEmpty();
        assertThat(result.total()).isZero();
    }

    /**
     * detail() overlays the same way; no orderable date means the product does not exist for a
     * buyer.
     */
    @Test
    void detailOverlaysTheNearestAvailableDate() {
        when(repository.findVisibleById(1L))
                .thenReturn(Optional.of(new ProductDetailRow(item(1L), "Cắt sáng")));
        when(availability.resolve(Map.of(1L, new BigDecimal("12000"))))
                .thenReturn(
                        Map.of(
                                1L,
                                new ProductAvailabilityResolver.Availability(
                                        LocalDate.of(2026, 9, 28), 40, new BigDecimal("13000"))));
        when(stallService.publicDetail(10L))
                .thenReturn(
                        new StallDetailResource(
                                10L,
                                "Vườn Út Hiền",
                                "Hiền",
                                null,
                                null,
                                12,
                                BigDecimal.ZERO,
                                0,
                                "approved",
                                List.of()));

        ProductDetailResource result = service.detail(1L);

        assertThat(result.product().stockQuantity()).isEqualTo(40);
        assertThat(result.product().price()).isEqualByComparingTo("13000");
    }

    @Test
    void detailThrowsWhenTheProductHasNoOrderableDate() {
        when(repository.findVisibleById(1L))
                .thenReturn(Optional.of(new ProductDetailRow(item(1L), "Cắt sáng")));
        when(availability.resolve(any())).thenReturn(Map.of());

        assertThatThrownBy(() -> service.detail(1L)).isInstanceOf(ProductNotFoundException.class);
    }
}
