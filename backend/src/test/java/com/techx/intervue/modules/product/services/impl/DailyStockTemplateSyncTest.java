package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.services.impl.DailyStockTemplateSync.DayPlan;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DailyStockTemplateSyncTest {

    private static final long PRODUCT_ID = 1L;

    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-09-29T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private static final LocalDate SATURDAY = LocalDate.of(2026, 10, 3);

    private static final LocalDate SUNDAY = LocalDate.of(2026, 10, 4);

    private ProductDailyStockRepository dailyStock;
    private ProductQueryRepository query;
    private DailyStockTemplateSync sync;

    @BeforeEach
    void setUp() {
        dailyStock = mock(ProductDailyStockRepository.class);
        query = mock(ProductQueryRepository.class);
        sync = new DailyStockTemplateSync(dailyStock, query, CLOCK);
    }

    private static Product product(String price) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setPrice(new BigDecimal(price));
        return p;
    }

    private static ProductDailyStock row(LocalDate date, int left, String price) {
        ProductDailyStock row = new ProductDailyStock();
        row.setProductId(PRODUCT_ID);
        row.setStockDate(date);
        row.setQuantityAvailable(left);
        row.setUnitPrice(new BigDecimal(price));
        return row;
    }

    private static WeeklyStockTemplate template(int dayOfWeek, String price) {
        WeeklyStockTemplate t = new WeeklyStockTemplate();
        t.setProductId(PRODUCT_ID);
        t.setDayOfWeek(dayOfWeek);
        t.setDefaultQuantity(30);
        t.setDefaultPrice(price == null ? null : new BigDecimal(price));
        return t;
    }

    @Test
    void aNewPriceReachesTheDaysStillSoldAtTheOldOne() {
        ProductDailyStock saturday = row(SATURDAY, 27, "0.50");
        when(dailyStock.lockFrom(PRODUCT_ID, LocalDate.of(2026, 9, 29)))
                .thenReturn(List.of(saturday));

        sync.followPrice(product("0.80"), new BigDecimal("0.5"), List.of(template(6, null)));

        assertThat(saturday.getUnitPrice()).isEqualByComparingTo("0.80");
        assertThat(saturday.getQuantityAvailable()).isEqualTo(27);
    }

    @Test
    void aDayPricedByHandADealOrItsOwnTemplatePriceKeepsItsPrice() {
        ProductDailyStock byHand = row(SATURDAY, 27, "0.70");
        ProductDailyStock deal = row(SATURDAY.plusDays(7), 10, "0.50");
        deal.startDeal(new BigDecimal("0.25"), 50, SATURDAY, SATURDAY.plusDays(8));
        ProductDailyStock ownPrice = row(SUNDAY, 30, "0.50");
        when(dailyStock.lockFrom(any(), any())).thenReturn(List.of(byHand, deal, ownPrice));

        sync.followPrice(
                product("0.80"),
                new BigDecimal("0.50"),
                List.of(template(6, null), template(0, "0.50")));

        assertThat(byHand.getUnitPrice()).isEqualByComparingTo("0.70");
        assertThat(deal.getUnitPrice()).isEqualByComparingTo("0.25");
        assertThat(ownPrice.getUnitPrice()).isEqualByComparingTo("0.50");
        verify(dailyStock, never()).save(any());
    }

    @Test
    void anUnchangedPriceLocksNothing() {
        sync.followPrice(product("0.50"), new BigDecimal("0.50"), List.of());

        verify(dailyStock, never()).lockFrom(any(), any());
    }

    @Test
    void aRaisedQuotaKeepsWhatIsAlreadySold() {
        ProductDailyStock saturday = row(SATURDAY, 27, "0.50");
        when(query.soldFrom(PRODUCT_ID, LocalDate.of(2026, 9, 29))).thenReturn(Map.of(SATURDAY, 3));

        sync.followTemplate(
                product("0.50"),
                List.of(saturday),
                Map.of(6, new DayPlan(30, null)),
                Map.of(6, new DayPlan(50, null)));

        assertThat(saturday.getQuantityAvailable()).isEqualTo(47);
        verify(dailyStock).save(saturday);
    }

    @Test
    void aQuotaBelowWhatIsSoldLeavesNothingNeverLessThanZero() {
        ProductDailyStock saturday = row(SATURDAY, 20, "0.50");
        when(query.soldFrom(any(Long.class), any())).thenReturn(Map.of(SATURDAY, 10));

        sync.followTemplate(
                product("0.50"),
                List.of(saturday),
                Map.of(6, new DayPlan(30, null)),
                Map.of(6, new DayPlan(5, null)));

        assertThat(saturday.getQuantityAvailable()).isZero();
    }

    @Test
    void aDroppedWeekdayStopsSelling() {
        ProductDailyStock saturday = row(SATURDAY, 27, "0.50");
        when(query.soldFrom(any(Long.class), any())).thenReturn(Map.of(SATURDAY, 3));

        sync.followTemplate(
                product("0.50"), List.of(saturday), Map.of(6, new DayPlan(30, null)), Map.of());

        assertThat(saturday.getQuantityAvailable()).isZero();
    }

    @Test
    void aDaySetByHandKeepsItsQuantity() {
        ProductDailyStock saturday = row(SATURDAY, 27, "0.50");
        when(query.soldFrom(any(Long.class), any())).thenReturn(Map.of(SATURDAY, 3));

        sync.followTemplate(
                product("0.50"),
                List.of(saturday),
                Map.of(6, new DayPlan(40, null)),
                Map.of(6, new DayPlan(50, null)));

        assertThat(saturday.getQuantityAvailable()).isEqualTo(27);
    }

    @Test
    void aWeekdayThatDidNotChangeAndADealDayAreLeftAlone() {
        ProductDailyStock sunday = row(SUNDAY, 5, "0.50");
        ProductDailyStock deal = row(SATURDAY, 30, "0.50");
        deal.startDeal(new BigDecimal("0.25"), 50, SATURDAY, SATURDAY.plusDays(1));

        sync.followTemplate(
                product("0.50"),
                List.of(sunday, deal),
                Map.of(0, new DayPlan(30, null), 6, new DayPlan(30, null)),
                Map.of(0, new DayPlan(30, null), 6, new DayPlan(50, null)));

        assertThat(sunday.getQuantityAvailable()).isEqualTo(5);
        assertThat(deal.getQuantityAvailable()).isEqualTo(30);
        assertThat(deal.getUnitPrice()).isEqualByComparingTo("0.25");
        verify(dailyStock, never()).save(any());
    }

    @Test
    void aNewTemplatePriceReachesTheDaysStillAtTheOldOne() {
        ProductDailyStock saturday = row(SATURDAY, 30, "0.50");

        sync.followTemplate(
                product("0.50"),
                List.of(saturday),
                Map.of(6, new DayPlan(30, null)),
                Map.of(6, new DayPlan(30, new BigDecimal("0.90"))));

        assertThat(saturday.getUnitPrice()).isEqualByComparingTo("0.90");
        assertThat(saturday.getQuantityAvailable()).isEqualTo(30);
    }
}
