package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.FarmerDailyStockRequest;
import com.techx.intervue.modules.product.resources.DailyStockResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FarmerDailyStockServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;
    private static final LocalDate DATE = LocalDate.of(2026, 9, 28);

    private ProductDailyStockRepository dailyStock;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private RestockNotifier restock;
    private FarmerDailyStockService service;

    @BeforeEach
    void setUp() {
        dailyStock = mock(ProductDailyStockRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        restock = mock(RestockNotifier.class);
        service = new FarmerDailyStockService(dailyStock, products, farmers, restock);
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder().id(FARMER_ID).userId(USER_ID).approvalStatus(status).build();
    }

    private static Product product(long farmerId) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        return p;
    }

    private void approvedStall() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID)));
    }

    @Test
    void overrideRejectsStallNotApproved() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(StallNotApprovedException.class);
    }

    @Test
    void overrideRejectsProductNotOwnedByFarmer() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(OTHER_FARMER_ID)));

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(ProductNotYoursException.class);
    }

    /** No template covers that weekday → materialize inserts nothing → nothing to override. */
    @Test
    void overrideRejectsADateWithNoTemplate() {
        approvedStall();
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                service.override(
                                        USER_ID,
                                        PRODUCT_ID,
                                        DATE,
                                        new FarmerDailyStockRequest(15, new BigDecimal("18000"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void overrideOverwritesQuantityAndPrice() {
        approvedStall();
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(DATE);
        row.setQuantityAvailable(40);
        row.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(
                        USER_ID,
                        PRODUCT_ID,
                        DATE,
                        new FarmerDailyStockRequest(15, new BigDecimal("18000")));

        assertThat(result.quantityAvailable()).isEqualTo(15);
        assertThat(result.unitPrice()).isEqualByComparingTo("18000");
        verify(dailyStock).save(row);
    }

    /**
     * {@code unitPrice} null in the request keeps the row's existing price, only the quantity
     * changes.
     */
    @Test
    void overrideKeepsExistingPriceWhenRequestPriceIsNull() {
        approvedStall();
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setQuantityAvailable(40);
        row.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, null));

        assertThat(result.unitPrice()).isEqualByComparingTo("12000");
    }

    /**
     * FR-041: putting stock back on a sold-out date can make the product orderable again — the
     * customers who favourited it are told, the same way a weekly template gaining a day does.
     */
    @Test
    void overrideReportsWhetherTheProductBecameOrderable() {
        approvedStall();
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setQuantityAvailable(0);
        row.setUnitPrice(new BigDecimal("12000"));
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));
        when(restock.isOrderable(any())).thenReturn(false, true);

        service.override(USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, null));

        verify(restock).afterChange(any(Product.class), eq(false), eq(true));
    }

    /**
     * FR-124: an explicit price for the day ends its near-expiry deal, so the percent shown on
     * /deals always matches what customers pay.
     */
    @Test
    void overrideWithAPriceEndsTheDeal() {
        approvedStall();
        ProductDailyStock row = dealRow();
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(
                        USER_ID,
                        PRODUCT_ID,
                        DATE,
                        new FarmerDailyStockRequest(15, new BigDecimal("0.55")));

        assertThat(result.unitPrice()).isEqualByComparingTo("0.55");
        assertThat(result.listPrice()).isNull();
        assertThat(result.discountPercent()).isNull();
        assertThat(row.hasDeal()).isFalse();
    }

    /** Changing only the quantity keeps the deal and its price. */
    @Test
    void overrideWithoutAPriceKeepsTheDeal() {
        approvedStall();
        ProductDailyStock row = dealRow();
        when(dailyStock.lockByProductIdAndStockDate(PRODUCT_ID, DATE)).thenReturn(Optional.of(row));
        when(dailyStock.save(any())).thenAnswer(i -> i.getArgument(0));

        DailyStockResource result =
                service.override(USER_ID, PRODUCT_ID, DATE, new FarmerDailyStockRequest(15, null));

        assertThat(result.quantityAvailable()).isEqualTo(15);
        assertThat(result.unitPrice()).isEqualByComparingTo("0.48");
        assertThat(result.listPrice()).isEqualByComparingTo("0.60");
        assertThat(result.discountPercent()).isEqualTo(20);
    }

    private static ProductDailyStock dealRow() {
        ProductDailyStock row = new ProductDailyStock();
        row.setId(500L);
        row.setProductId(PRODUCT_ID);
        row.setStockDate(DATE);
        row.setQuantityAvailable(12);
        row.setUnitPrice(new BigDecimal("0.60"));
        row.startDeal(new BigDecimal("0.48"), 20, DATE.minusDays(4), DATE.plusDays(2));
        return row;
    }
}
