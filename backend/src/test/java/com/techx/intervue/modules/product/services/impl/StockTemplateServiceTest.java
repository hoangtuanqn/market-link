package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
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
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class StockTemplateServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;

    private WeeklyStockTemplateRepository templates;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private RestockNotifier restock;
    private DailyStockTemplateSync sync;
    private StockTemplateService service;

    @BeforeEach
    void setUp() {
        templates = mock(WeeklyStockTemplateRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        restock = mock(RestockNotifier.class);
        sync = mock(DailyStockTemplateSync.class);
        service = new StockTemplateService(templates, products, farmers, restock, sync);
        when(products.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder()
                .id(FARMER_ID)
                .userId(USER_ID)
                .stallName("Vườn Út Hiền")
                .contactPerson("Hiền")
                .approvalStatus(status)
                .build();
    }

    private static Product product(long farmerId) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        p.setName("Rau muống");
        p.setPrice(new BigDecimal("1.50"));
        p.setUnit("bó");
        p.setStockQuantity(5);
        p.setStatus(ProductStatus.SOLD_OUT);
        return p;
    }

    private void approvedStall() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
    }

    // ---- list ----

    /**
     * FR-071: reading the weekly plan used to be allowed while suspended. D-09 is stricter — a
     * suspended Farmer sees only their old orders — so this screen closes with the rest of the
     * selling panel.
     */
    @Test
    void listIsRefusedWhileTheStallIsSuspended() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        assertThatThrownBy(() -> service.list(USER_ID)).isInstanceOf(StallSuspendedException.class);
    }

    // ---- replace ----

    @Test
    void replaceRejectsStallNotApproved() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(() -> service.replace(USER_ID, oneItemRequest(1, 40, null)))
                .isInstanceOf(StallNotApprovedException.class);
        verify(templates, never()).replaceAll(any(), any());
    }

    /** Review focus #3, áp dụng cho FR-063: đổi productId trên body → 403, không phải 404. */
    @Test
    void replaceRejectsProductNotOwnedByFarmer() {
        approvedStall();
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(OTHER_FARMER_ID)));

        assertThatThrownBy(() -> service.replace(USER_ID, oneItemRequest(1, 40, null)))
                .isInstanceOf(ProductNotYoursException.class);
        verify(templates, never()).replaceAll(any(), any());
    }

    @Test
    void replaceRejectsDuplicateDayForSameProduct() {
        approvedStall();
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID)));
        StockTemplateRequest request =
                new StockTemplateRequest(
                        List.of(
                                new StockTemplateRequest.Item(PRODUCT_ID, 1, 40, null),
                                new StockTemplateRequest.Item(PRODUCT_ID, 1, 30, null)));

        assertThatThrownBy(() -> service.replace(USER_ID, request))
                .isInstanceOf(IllegalArgumentException.class);
        verify(templates, never()).replaceAll(any(), any());
    }

    @Test
    void replaceOverwritesEntireSet() {
        approvedStall();
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(FARMER_ID)));
        when(templates.findResourcesByFarmerId(FARMER_ID)).thenReturn(List.of());
        StockTemplateRequest request = oneItemRequest(1, 40, new BigDecimal("2.00"));

        service.replace(USER_ID, request);

        verify(templates).replaceAll(FARMER_ID, request.items());
    }

    /**
     * FR-041: a product with zero templates is never orderable (decision D-02 redesign). Adding its
     * first template can take it from "never orderable" to orderable — a restock event, told to
     * whoever favourited the product.
     */
    @Test
    void replaceTellsTheRestockNotifierWhenAProductGainsItsFirstOrderableDate() {
        approvedStall();
        Product product = product(FARMER_ID);
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(templates.findResourcesByFarmerId(FARMER_ID)).thenReturn(List.of());
        when(restock.isOrderable(product)).thenReturn(false, true);

        service.replace(USER_ID, oneItemRequest(1, 40, new BigDecimal("2.00")));

        verify(restock).afterChange(product, false, true);
    }

    /**
     * {@code afterChange} is always called with both booleans, the same convention as {@code
     * ProductService} and {@code OrderService} — {@link RestockNotifier} itself decides whether
     * "already orderable before" means staying quiet.
     */
    @Test
    void replaceCallsAfterChangeEvenWhenNothingReallyChanged() {
        approvedStall();
        Product product = product(FARMER_ID);
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(templates.findResourcesByFarmerId(FARMER_ID)).thenReturn(List.of());
        when(restock.isOrderable(product)).thenReturn(true, true);

        service.replace(USER_ID, oneItemRequest(1, 40, new BigDecimal("2.00")));

        verify(restock).afterChange(product, true, true);
    }

    /**
     * FR-062/FR-063: the days that already have a daily-stock row follow the new template. Their
     * rows are locked before the restock check reads them (C5-2), and followed after the new set is
     * written.
     */
    @Test
    void replaceLocksTheDaysFirstThenMakesThemFollowTheNewTemplate() {
        approvedStall();
        Product product = product(FARMER_ID);
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(product));
        when(templates.findByFarmerIdAndActiveTrue(FARMER_ID))
                .thenReturn(List.of(template(PRODUCT_ID, 6, 30)));
        List<ProductDailyStock> rows = List.of(new ProductDailyStock());
        when(sync.lockUpcoming(PRODUCT_ID)).thenReturn(rows);

        service.replace(USER_ID, oneItemRequest(6, 50, null));

        InOrder order = inOrder(sync, restock, templates);
        order.verify(sync).lockUpcoming(PRODUCT_ID);
        order.verify(restock).isOrderable(product);
        order.verify(templates).replaceAll(any(), any());
        order.verify(sync)
                .followTemplate(
                        product,
                        rows,
                        Map.of(6, new DailyStockTemplateSync.DayPlan(30, null)),
                        Map.of(6, new DailyStockTemplateSync.DayPlan(50, null)));
    }

    /** A product left out of the request lost every weekday: its booked days stop selling too. */
    @Test
    void replaceAlsoMakesAProductDroppedFromTheRequestFollow() {
        approvedStall();
        Product kept = product(FARMER_ID);
        Product dropped = product(FARMER_ID);
        dropped.setId(PRODUCT_ID + 1);
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(kept));
        when(products.findByIdAndDeletedFalse(PRODUCT_ID + 1)).thenReturn(Optional.of(dropped));
        when(templates.findByFarmerIdAndActiveTrue(FARMER_ID))
                .thenReturn(List.of(template(PRODUCT_ID + 1, 6, 30)));
        when(sync.lockUpcoming(PRODUCT_ID + 1)).thenReturn(List.of());

        service.replace(USER_ID, oneItemRequest(1, 40, null));

        verify(sync)
                .followTemplate(
                        dropped,
                        List.of(),
                        Map.of(6, new DailyStockTemplateSync.DayPlan(30, null)),
                        Map.of());
    }

    private static WeeklyStockTemplate template(long productId, int dayOfWeek, int quantity) {
        WeeklyStockTemplate t = new WeeklyStockTemplate();
        t.setFarmerId(FARMER_ID);
        t.setProductId(productId);
        t.setDayOfWeek(dayOfWeek);
        t.setDefaultQuantity(quantity);
        return t;
    }

    private static StockTemplateRequest oneItemRequest(
            int dayOfWeek, int quantity, BigDecimal price) {
        return new StockTemplateRequest(
                List.of(new StockTemplateRequest.Item(PRODUCT_ID, dayOfWeek, quantity, price)));
    }
}
