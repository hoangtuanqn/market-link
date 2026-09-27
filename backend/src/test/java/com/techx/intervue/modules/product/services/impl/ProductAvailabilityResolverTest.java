package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProductAvailabilityResolverTest {

    /** Saturday 26/09/2026 — the same fixed "today" used in OrderServiceTest. */
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    private static final long PRODUCT_ID = 1L;

    private WeeklyStockTemplateRepository templates;
    private ProductDailyStockRepository dailyStock;
    private ProductAvailabilityResolver resolver;

    @BeforeEach
    void setUp() {
        templates = mock(WeeklyStockTemplateRepository.class);
        dailyStock = mock(ProductDailyStockRepository.class);
        Clock clock =
                Clock.fixed(
                        ZonedDateTime.of(TODAY, LocalTime.NOON, ZoneId.of("Asia/Ho_Chi_Minh"))
                                .toInstant(),
                        ZoneId.of("Asia/Ho_Chi_Minh"));
        resolver = new ProductAvailabilityResolver(templates, dailyStock, clock);
    }

    private static WeeklyStockTemplate template(int dayOfWeek, int qty, BigDecimal price) {
        WeeklyStockTemplate t = new WeeklyStockTemplate();
        t.setProductId(PRODUCT_ID);
        t.setDayOfWeek(dayOfWeek);
        t.setDefaultQuantity(qty);
        t.setDefaultPrice(price);
        t.setActive(true);
        return t;
    }

    @Test
    void nearestDateFindsTheClosestMatchingWeekday() {
        // TODAY (26/09) is a Saturday = 6; the template only sells on Monday = 1, 2 days away.
        Optional<LocalDate> found =
                ProductAvailabilityResolver.nearestDate(TODAY, List.of(template(1, 10, null)));

        assertThat(found).contains(LocalDate.of(2026, 9, 28));
    }

    @Test
    void nearestDateIncludesToday() {
        // TODAY (26/09) is a Saturday = 6.
        Optional<LocalDate> found =
                ProductAvailabilityResolver.nearestDate(TODAY, List.of(template(6, 10, null)));

        assertThat(found).contains(TODAY);
    }

    @Test
    void nearestDateIsEmptyWithNoTemplates() {
        assertThat(ProductAvailabilityResolver.nearestDate(TODAY, List.of())).isEmpty();
    }

    @Test
    void resolveUsesTheTemplateDefaultsWhenNoDailyStockRowExistsYet() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, new BigDecimal("13000"))));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        ProductAvailabilityResolver.Availability a = result.get(PRODUCT_ID);
        assertThat(a.date()).isEqualTo(LocalDate.of(2026, 9, 28));
        assertThat(a.quantity()).isEqualTo(40);
        assertThat(a.price()).isEqualByComparingTo("13000");
    }

    @Test
    void resolveFallsBackToTheBasePriceWhenTheTemplatePriceIsNull() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, null)));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.empty());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result.get(PRODUCT_ID).price()).isEqualByComparingTo("12000");
    }

    @Test
    void resolvePrefersAnExistingDailyStockRowOverTheTemplateDefault() {
        LocalDate nearest = LocalDate.of(2026, 9, 28);
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(1, 40, new BigDecimal("13000"))));
        ProductDailyStock existing = new ProductDailyStock();
        existing.setQuantityAvailable(6); // 34 already sold
        existing.setUnitPrice(new BigDecimal("13000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, nearest))
                .thenReturn(Optional.of(existing));

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result.get(PRODUCT_ID).quantity()).isEqualTo(6);
    }

    @Test
    void resolveOmitsAProductWithNoOrderableDateWithinTheLookahead() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID)).thenReturn(List.of());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result).doesNotContainKey(PRODUCT_ID);
    }
}
