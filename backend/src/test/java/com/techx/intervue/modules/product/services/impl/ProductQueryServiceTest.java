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
import com.techx.intervue.modules.product.resources.ProductListItemResource;
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
    private ProductQueryService service;

    @BeforeEach
    void setUp() {
        repository = mock(ProductQueryRepository.class);
        stallService = mock(StallServiceInterface.class);
        service = new ProductQueryService(repository, stallService);
        when(repository.search(any(), anyString(), anyInt(), anyInt()))
                .thenReturn(new PageResource<ProductListItemResource>(List.of(), 1, 12, 0));
    }

    private static ProductSearchCriteria criteria(
            String sort, BigDecimal min, BigDecimal max, int pageSize) {
        return new ProductSearchCriteria(null, null, null, null, null, min, max, sort, 1, pageSize);
    }

    /** `sort` từ query string đi qua whitelist, không bao giờ nối thẳng vào ORDER BY (R-04). */
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

    /** Sản phẩm xoá mềm không đi qua bộ lọc public; service không có đường nào trả dữ liệu cũ. */
    @Test
    void detailOnDeletedProductThrows() {
        assertThat(ProductQueryRepository.DETAIL_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
        when(repository.findVisibleById(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.detail(5L)).isInstanceOf(ProductNotFoundException.class);
    }
}
