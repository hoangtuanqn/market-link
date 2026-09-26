package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Review focus #5 / D-09 — sản phẩm của stall bị đình chỉ phải biến mất khỏi mọi trang public,
 * nhưng bản ghi vẫn còn để đơn đang chạy đọc được. Test đọc thẳng câu SQL hằng số, không cần
 * database.
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

    @Test
    void searchSqlAndDetailSqlBothUseTheSameFilter() {
        assertThat(ProductQueryRepository.SEARCH_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
        assertThat(ProductQueryRepository.DETAIL_SQL)
                .contains(ProductQueryRepository.VISIBILITY_FILTER);
    }
}
