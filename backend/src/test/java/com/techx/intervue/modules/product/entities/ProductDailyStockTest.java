package com.techx.intervue.modules.product.entities;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class ProductDailyStockTest {

    private static final LocalDate PACKED = LocalDate.of(2026, 9, 29);
    private static final LocalDate BEST_BEFORE = LocalDate.of(2026, 10, 5);

    private static ProductDailyStock day(String price) {
        ProductDailyStock row = new ProductDailyStock();
        row.setQuantityAvailable(30);
        row.setUnitPrice(new BigDecimal(price));
        return row;
    }

    @Test
    void aDealKeepsTheNormalPriceAndDescribesTheBatch() {
        ProductDailyStock row = day("0.60");

        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);

        assertThat(row.hasDeal()).isTrue();
        assertThat(row.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.48");
        assertThat(row.getDiscountPercent()).isEqualTo(20);
        assertThat(row.getPackedOn()).isEqualTo(PACKED);
        assertThat(row.getBestBefore()).isEqualTo(BEST_BEFORE);
        assertThat(row.getQuantityAvailable()).isEqualTo(30);
    }

    @Test
    void postingAgainKeepsTheFirstListPrice() {
        ProductDailyStock row = day("0.60");
        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);

        row.startDeal(new BigDecimal("0.36"), 40, PACKED.minusDays(1), BEST_BEFORE.minusDays(1));

        assertThat(row.getListPrice()).isEqualByComparingTo("0.60");
        assertThat(row.basePrice()).isEqualByComparingTo("0.60");
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.36");
        assertThat(row.getDiscountPercent()).isEqualTo(40);
    }

    @Test
    void endingADealRestoresThePriceAndKeepsTheQuantity() {
        ProductDailyStock row = day("0.60");
        row.startDeal(new BigDecimal("0.48"), 20, PACKED, BEST_BEFORE);
        row.setQuantityAvailable(12);

        row.endDeal();

        assertThat(row.hasDeal()).isFalse();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getListPrice()).isNull();
        assertThat(row.getPackedOn()).isNull();
        assertThat(row.getBestBefore()).isNull();
        assertThat(row.getQuantityAvailable()).isEqualTo(12);
    }

    @Test
    void endingADayWithoutADealChangesNothing() {
        ProductDailyStock row = day("0.60");

        row.endDeal();

        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.basePrice()).isEqualByComparingTo("0.60");
    }
}
