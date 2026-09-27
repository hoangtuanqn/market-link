package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Review focus #5 / D-09 — a suspended stall's products must disappear from every public page, but
 * the records remain so running orders can read them. The test reads the constant SQL statement
 * directly, needing no database.
 */
class ProductVisibilityFilterTest {

    @Test
    void publicProductSqlExcludesSuspendedStallsAndHiddenListings() {
        String sql = ProductQueryRepository.VISIBILITY_FILTER;

        assertThat(sql).contains("f.approval_status = 'approved'");
        assertThat(sql).contains("p.is_deleted = FALSE");
        assertThat(sql).contains("p.is_hidden = FALSE");
        assertThat(sql).doesNotContain("'suspended'");
    }

    /**
     * FR-063 daily stock: a product with no active weekly template is never orderable, so the
     * public pages leave it out — inside the SQL, so the page and its total count agree.
     */
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
