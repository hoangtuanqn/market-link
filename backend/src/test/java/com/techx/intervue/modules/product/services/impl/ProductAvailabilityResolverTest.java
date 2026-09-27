package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProductAvailabilityResolverTest {

    /** Saturday 26/09/2026 — the same fixed "today" used in OrderServiceTest. */
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 26);

    private static final long PRODUCT_ID = 1L;
    private static final long FARMER_ID = 7L;

    private WeeklyStockTemplateRepository templates;
    private ProductDailyStockRepository dailyStock;
    private SlotQueryRepository slots;
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
        ProductRepository products = mock(ProductRepository.class);
        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setFarmerId(FARMER_ID);
        when(products.findAllById(any())).thenReturn(List.of(product));
        slots = mock(SlotQueryRepository.class);
        // By default every date in the lookahead still has an open slot
        openDates(TODAY.datesUntil(TODAY.plusDays(14)).collect(Collectors.toSet()));
        resolver = new ProductAvailabilityResolver(templates, dailyStock, products, slots, clock);
    }

    private void openDates(Set<LocalDate> dates) {
        when(slots.orderableDates(anyCollection(), any(), any(), any()))
                .thenReturn(Map.of(FARMER_ID, dates));
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
    void candidateDatesAreTheMatchingWeekdaysInsideTheLookaheadNearestFirst() {
        // TODAY (26/09) is a Saturday = 6; the template only sells on Monday = 1, 2 days away.
        List<LocalDate> found =
                ProductAvailabilityResolver.candidateDates(TODAY, List.of(template(1, 10, null)));

        assertThat(found).containsExactly(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 10, 5));
    }

    @Test
    void candidateDatesIncludeToday() {
        // TODAY (26/09) is a Saturday = 6.
        List<LocalDate> found =
                ProductAvailabilityResolver.candidateDates(TODAY, List.of(template(6, 10, null)));

        assertThat(found).first().isEqualTo(TODAY);
    }

    @Test
    void candidateDatesAreEmptyWithNoTemplates() {
        assertThat(ProductAvailabilityResolver.candidateDates(TODAY, List.of())).isEmpty();
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

    /**
     * The nearest date is sold out while a later date of the template still has stock: the product
     * can still be ordered, so browse, the cart and restock alerts must report that later date
     * instead of showing the product as sold out.
     */
    @Test
    void resolveSkipsASoldOutDateForTheNextDateWithStock() {
        // TODAY (26/09) is a Saturday = 6; the stall sells on Saturday and Monday
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null), template(1, 20, null)));
        ProductDailyStock soldOut = new ProductDailyStock();
        soldOut.setQuantityAvailable(0);
        soldOut.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, TODAY))
                .thenReturn(Optional.of(soldOut));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, LocalDate.of(2026, 9, 28)))
                .thenReturn(Optional.empty());

        ProductAvailabilityResolver.Availability a =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))).get(PRODUCT_ID);

        assertThat(a.date()).isEqualTo(LocalDate.of(2026, 9, 28));
        assertThat(a.quantity()).isEqualTo(20);
    }

    /** Every date inside the lookahead is sold out: the nearest one is reported, with 0. */
    @Test
    void resolveReportsTheNearestDateWhenEveryDateIsSoldOut() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null)));
        ProductDailyStock soldOut = new ProductDailyStock();
        soldOut.setQuantityAvailable(0);
        soldOut.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.findByProductIdAndStockDate(any(), any())).thenReturn(Optional.of(soldOut));

        ProductAvailabilityResolver.Availability a =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))).get(PRODUCT_ID);

        assertThat(a.date()).isEqualTo(TODAY);
        assertThat(a.quantity()).isZero();
    }

    @Test
    void resolveOmitsAProductWithNoOrderableDateWithinTheLookahead() {
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID)).thenReturn(List.of());

        Map<Long, ProductAvailabilityResolver.Availability> result =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")));

        assertThat(result).doesNotContainKey(PRODUCT_ID);
    }

    /**
     * The reported bug: today (Saturday) is past its cutoff, so orders go to next Saturday — the
     * number shown must be that date's stock, which a sale lowers, not today's untouched template.
     */
    @Test
    void resolveSkipsADateThatNoLongerHasAnOrderableSlot() {
        LocalDate nextSaturday = TODAY.plusDays(7);
        openDates(Set.of(nextSaturday));
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null)));
        ProductDailyStock afterASale = new ProductDailyStock();
        afterASale.setQuantityAvailable(25);
        afterASale.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, nextSaturday))
                .thenReturn(Optional.of(afterASale));
        when(dailyStock.findByProductIdAndStockDate(PRODUCT_ID, TODAY))
                .thenReturn(Optional.empty());

        ProductAvailabilityResolver.Availability a =
                resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000"))).get(PRODUCT_ID);

        assertThat(a.date()).isEqualTo(nextSaturday);
        assertThat(a.quantity()).isEqualTo(25);
    }

    @Test
    void resolveOmitsAProductWhoseStallHasNoOrderableSlot() {
        openDates(Set.of());
        when(templates.findByProductIdAndActiveTrue(PRODUCT_ID))
                .thenReturn(List.of(template(6, 30, null)));

        assertThat(resolver.resolve(Map.of(PRODUCT_ID, new BigDecimal("12000")))).isEmpty();
    }
}
