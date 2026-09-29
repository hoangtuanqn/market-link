package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ProductVisibilityFilterTest {

    @Test
    void publicProductSqlExcludesSuspendedStallsAndHiddenListings() {
        String sql = ProductQueryRepository.VISIBILITY_FILTER;

        assertThat(sql).contains("f.approval_status = 'approved'");
        assertThat(sql).contains("p.is_deleted = FALSE");
        assertThat(sql).contains("p.is_hidden = FALSE");
        assertThat(sql).doesNotContain("'suspended'");
    }

    @Test
    void publicProductSqlOnlyListsProductsWithAnActiveWeeklyTemplate() {
        assertThat(ProductQueryRepository.VISIBILITY_FILTER)
                .contains("FROM weekly_stock_templates t")
                .contains("t.product_id = p.id")
                .contains("t.is_active = TRUE");
    }

    @Test
    void searchSqlAndDetailSqlBothUseTheSameFilter() {
        assertThat(ProductQueryRepository.SEARCH_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
        assertThat(ProductQueryRepository.DETAIL_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
    }
}
