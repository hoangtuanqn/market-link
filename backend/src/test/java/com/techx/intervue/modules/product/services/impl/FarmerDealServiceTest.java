package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.DealQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.DealRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * FR-124 (spec §4.5.1, §4.5.3, §8). Today (by Clock) is Wednesday 30/09/2026, 10:00 Vietnam time;
 * the pickup day is Saturday 03/10; the product keeps 7 days and sells at $0.60.
 */
class FarmerDealServiceTest {

    private static final ZoneId HCM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);
    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);
    private static final LocalDate HARVESTED = LocalDate.of(2026, 9, 29);
    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long PRODUCT_ID = 100L;

    private ProductDailyStockRepository dailyStock;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private SlotQueryRepository slots;
    private ProductAvailabilityResolver availability;
    private DealQueryRepository deals;
    private FarmerDealService service;
    private ProductDailyStock row;

    @BeforeEach
    void setUp() {
        dailyStock = mock(ProductDailyStockRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        slots = mock(SlotQueryRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        deals = mock(DealQueryRepository.class);
        Clock clock =
                Clock.fixed(ZonedDateTime.of(TODAY, LocalTime.of(10, 0), HCM).toInstant(), HCM);
        service =
                new FarmerDealService(
                        dailyStock,
                        products,
                        farmers,
                        slots,
                        availability,
                        deals,
                        mock(RestockNotifier.class),
                        clock);

        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID, 7)));
        when(slots.orderableDates(anyCollection(), any(), any(), any()))
                .thenReturn(Map.of(FARMER_ID, Set.of(PICKUP)));
        row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(PICKUP);
        row.setQuantityAvailable(30);
        row.setUnitPrice(new BigDecimal("0.60"));
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, PICKUP))
                .thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder().id(FARMER_ID).userId(USER_ID).approvalStatus(status).build();
    }

    private static Product product(long farmerId, int shelfLifeDays) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        p.setPrice(new BigDecimal("0.60"));
        p.setShelfLifeDays(shelfLifeDays);
        return p;
    }

    /** Spec §4.5.2 example: harvested 29/09, picked up Sat 03/10 → good until 05/10, 3 days. */
    private static DealRequest request(int percent) {
        return new DealRequest(12, HARVESTED, percent);
    }

    @Test
    void postPutsTheLockedDayOnTheDeal() {
        DailyStockResource result = service.post(USER_ID, PRODUCT_ID, PICKUP, request(20));

        assertThat(result.quantityAvailable()).isEqualTo(12);
        assertThat(result.listPrice()).isEqualByComparingTo("0.60");
        assertThat(result.unitPrice()).isEqualByComparingTo("0.48");
        assertThat(result.discountPercent()).isEqualTo(20);
        assertThat(result.packedOn()).isEqualTo(HARVESTED);
        assertThat(result.bestBefore()).isEqualTo(LocalDate.of(2026, 10, 5));
        // Created when missing, then locked by its natural key, like placing an order (spec §8)
        verify(dailyStock).materialize(PRODUCT_ID, PICKUP, 6);
        verify(dailyStock).lockByProductIdAndStockDate(PRODUCT_ID, PICKUP);
        verify(dailyStock, never()).findByProductIdAndStockDate(any(), any());
    }

    @Test
    void postingAgainTakesTheNewDiscountOffTheNormalPrice() {
        service.post(USER_ID, PRODUCT_ID, PICKUP, request(20));

        DailyStockResource again = service.post(USER_ID, PRODUCT_ID, PICKUP, request(40));

        assertThat(again.listPrice()).isEqualByComparingTo("0.60");
        assertThat(again.unitPrice()).isEqualByComparingTo("0.36");
    }

    /** D-09, spec §8: a suspended stall cannot post a deal, and is told it is suspended. */
    @Test
    void postRefusesASuspendedStall() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(StallSuspendedException.class);
        verify(dailyStock, never()).lockByProductIdAndStockDate(any(), any());
    }

    /** D-09: a stall still waiting for approval cannot post a deal either. */
    @Test
    void postRefusesAStallThatIsNotApproved() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(StallNotApprovedException.class);
        verify(dailyStock, never()).lockByProductIdAndStockDate(any(), any());
    }

    /** D-09: a suspended stall cannot remove a deal. */
    @Test
    void removeRefusesASuspendedStall() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.remove(USER_ID, PRODUCT_ID, PICKUP))
                .isInstanceOf(StallSuspendedException.class);
    }

    /** R-06: another stall's product → 403, even though the id is real. */
    @Test
    void postRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(ProductNotYoursException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 4, 33, 75})
    void postRefusesADiscountOutsideTheSteps(int percent) {
        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(percent)))
                .isInstanceOfSatisfying(
                        InvalidFieldException.class,
                        e -> assertThat(e.getField()).isEqualTo("discountPercent"));
    }

    @Test
    void postRefusesAPackingDateAfterToday() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        PICKUP,
                                        new DealRequest(12, TODAY.plusDays(1), 20)))
                .isInstanceOfSatisfying(
                        InvalidFieldException.class,
                        e -> assertThat(e.getField()).isEqualTo("packedOn"));
    }

    /** Packed today for pickup tomorrow: 6 of 7 days are still left, so it is not near expiry. */
    @Test
    void postRefusesProduceWithMoreThanHalfItsShelfLifeLeft() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        TODAY.plusDays(1),
                                        new DealRequest(12, TODAY, 20)))
                .isInstanceOf(NotNearExpiryException.class);
    }

    /** Picked on the pickup day itself is fresh produce. */
    @Test
    void postRefusesProducePickedOnThePickupDay() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID, PRODUCT_ID, TODAY, new DealRequest(12, TODAY, 20)))
                .isInstanceOf(NotNearExpiryException.class);
    }

    /** Packed 20/09 with 7 days: good until 26/09, before the pickup day. */
    @Test
    void postRefusesABatchThatIsGoneBeforePickup() {
        assertThatThrownBy(
                        () ->
                                service.post(
                                        USER_ID,
                                        PRODUCT_ID,
                                        PICKUP,
                                        new DealRequest(12, LocalDate.of(2026, 9, 20), 20)))
                .isInstanceOf(ExpiredBeforePickupException.class);
    }

    /** No free slot before the cutoff that day (or the market or the stall is closed). */
    @Test
    void postRefusesADayCustomersCanNoLongerOrder() {
        when(slots.orderableDates(anyCollection(), any(), any(), any())).thenReturn(Map.of());

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
        verify(dailyStock, never()).materialize(any(), any(), anyInt());
    }

    /** Beyond the 14-day window the public pages show, even when a slot exists. */
    @Test
    void postRefusesADayBeyondTheFourteenDayWindow() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID, 30)));
        LocalDate far = TODAY.plusDays(14);
        when(slots.orderableDates(anyCollection(), any(), any(), any()))
                .thenReturn(Map.of(FARMER_ID, Set.of(far)));

        // 30 days, packed 29/09: good until 28/10, 15 of 30 days left on 14/10 — near expiry
        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, far, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    /** No weekly template for that weekday: the product is not sold that day. */
    @Test
    void postRefusesADayWithoutAWeeklyTemplate() {
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, PICKUP))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.post(USER_ID, PRODUCT_ID, PICKUP, request(20)))
                .isInstanceOf(DateNotOrderableException.class);
    }

    @Test
    void removeRestoresTheNormalPriceAndKeepsTheQuantity() {
        row.startDeal(new BigDecimal("0.48"), 20, HARVESTED, LocalDate.of(2026, 10, 5));
        row.setQuantityAvailable(12);

        service.remove(USER_ID, PRODUCT_ID, PICKUP);

        assertThat(row.hasDeal()).isFalse();
        assertThat(row.getUnitPrice()).isEqualByComparingTo("0.60");
        assertThat(row.getQuantityAvailable()).isEqualTo(12);
        verify(dailyStock).save(row);
    }

    @Test
    void removeOnADayWithoutADealChangesNothing() {
        service.remove(USER_ID, PRODUCT_ID, PICKUP);

        verify(dailyStock, never()).save(any());
    }

    @Test
    void removeRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.remove(USER_ID, PRODUCT_ID, PICKUP))
                .isInstanceOf(ProductNotYoursException.class);
        verify(dailyStock, never()).lockByProductIdAndStockDate(any(), any());
    }

    /** Read-only: a suspended stall still sees its deals (D-09 blocks writes only). */
    @Test
    void mineListsTheStallsDealsFromToday() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));
        List<FarmerDealResource> rows =
                List.of(
                        new FarmerDealResource(
                                PRODUCT_ID,
                                "Cà chua bi",
                                "kg",
                                "2026-10-03",
                                12,
                                new BigDecimal("0.60"),
                                new BigDecimal("0.48"),
                                20,
                                "2026-09-29",
                                "2026-10-05",
                                3));
        when(deals.farmerDeals(FARMER_ID, TODAY)).thenReturn(rows);

        assertThat(service.mine(USER_ID)).isEqualTo(rows);
    }

    @Test
    void upcomingDaysGivesEachOrderableDayWithItsDeal() {
        when(availability.upcoming(any()))
                .thenReturn(
                        List.of(
                                new ProductAvailabilityResolver.Availability(
                                        PICKUP,
                                        12,
                                        new BigDecimal("0.48"),
                                        new ProductAvailabilityResolver.Deal(
                                                new BigDecimal("0.60"),
                                                20,
                                                HARVESTED,
                                                LocalDate.of(2026, 10, 5))),
                                new ProductAvailabilityResolver.Availability(
                                        PICKUP.plusDays(1), 20, new BigDecimal("0.60"))));

        List<DailyStockResource> days = service.upcomingDays(USER_ID, PRODUCT_ID);

        assertThat(days)
                .extracting(DailyStockResource::stockDate)
                .containsExactly(PICKUP, PICKUP.plusDays(1));
        assertThat(days.getFirst().discountPercent()).isEqualTo(20);
        assertThat(days.getFirst().listPrice()).isEqualByComparingTo("0.60");
        assertThat(days.get(1).listPrice()).isNull();
        assertThat(days.get(1).quantityAvailable()).isEqualTo(20);
    }

    @Test
    void upcomingDaysRefusesAnotherStallsProduct() {
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product(99L, 7)));

        assertThatThrownBy(() -> service.upcomingDays(USER_ID, PRODUCT_ID))
                .isInstanceOf(ProductNotYoursException.class);
    }
}
