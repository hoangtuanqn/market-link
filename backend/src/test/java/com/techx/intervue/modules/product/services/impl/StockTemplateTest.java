package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.requests.StockTemplateRequest.TemplateItem;
import com.techx.intervue.modules.product.resources.ApplyTemplateResultResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** FR-063 — weekly stock templates: save the whole set, then apply one weekday onto stock. */
class StockTemplateTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;

    /** 04/10/2026 is a Sunday → day_of_week 0. */
    private static final LocalDate SUNDAY = LocalDate.of(2026, 10, 4);

    private WeeklyStockTemplateRepository templates;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private StockTemplateService service;
    private RestockNotifier restock;

    /** Fake weekly_stock_templates table and products table. */
    private final List<WeeklyStockTemplate> table = new ArrayList<>();

    private final Map<Long, Product> productRows = new HashMap<>();

    @BeforeEach
    void setUp() {
        templates = mock(WeeklyStockTemplateRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        restock = mock(RestockNotifier.class);
        service = new StockTemplateService(templates, products, farmers, restock);

        when(farmers.findByUserId(USER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(FARMER_ID)
                                        .userId(USER_ID)
                                        .stallName("Vườn Út Hiền")
                                        .contactPerson("Hiền")
                                        .approvalStatus(ApprovalStatus.APPROVED)
                                        .build()));
        when(templates.findByFarmerId(FARMER_ID)).thenAnswer(inv -> List.copyOf(table));
        when(templates.findByFarmerIdAndDayOfWeekAndActiveTrue(anyLong(), anyInt()))
                .thenAnswer(
                        inv -> {
                            int day = inv.getArgument(1);
                            return table.stream()
                                    .filter(t -> t.getDayOfWeek() == day && t.isActive())
                                    .toList();
                        });
        org.mockito.Mockito.doAnswer(
                        inv -> {
                            table.clear();
                            return null;
                        })
                .when(templates)
                .deleteByFarmerId(FARMER_ID);
        when(templates.saveAll(any()))
                .thenAnswer(
                        inv -> {
                            Collection<WeeklyStockTemplate> rows = inv.getArgument(0);
                            table.addAll(rows);
                            return List.copyOf(rows);
                        });
        when(products.findAllById(any()))
                .thenAnswer(
                        inv -> {
                            Iterable<Long> ids = inv.getArgument(0);
                            List<Product> out = new ArrayList<>();
                            ids.forEach(
                                    id ->
                                            Optional.ofNullable(productRows.get(id))
                                                    .ifPresent(out::add));
                            return out;
                        });
        when(products.lockAllById(any()))
                .thenAnswer(
                        inv -> {
                            Collection<Long> ids = inv.getArgument(0);
                            return ids.stream()
                                    .map(productRows::get)
                                    .filter(java.util.Objects::nonNull)
                                    .sorted(Comparator.comparing(Product::getId))
                                    .toList();
                        });
        when(products.findByFarmerIdAndDeletedFalse(FARMER_ID))
                .thenAnswer(
                        inv ->
                                productRows.values().stream()
                                        .filter(p -> p.getFarmerId() == FARMER_ID && !p.isDeleted())
                                        .sorted(Comparator.comparing(Product::getId))
                                        .toList());
    }

    private Product product(long id, long farmerId, String name, int stock, ProductStatus status) {
        Product p = new Product();
        p.setId(id);
        p.setFarmerId(farmerId);
        p.setCategoryId(1L);
        p.setName(name);
        p.setPrice(new BigDecimal("20000"));
        p.setUnit("kg");
        p.setStockQuantity(stock);
        p.setStatus(status);
        productRows.put(id, p);
        return p;
    }

    private void template(long productId, int day, int quantity, BigDecimal price) {
        WeeklyStockTemplate t = new WeeklyStockTemplate();
        t.setFarmerId(FARMER_ID);
        t.setProductId(productId);
        t.setDayOfWeek(day);
        t.setDefaultQuantity(quantity);
        t.setDefaultPrice(price);
        t.setActive(true);
        table.add(t);
    }

    private static StockTemplateRequest items(TemplateItem... items) {
        return new StockTemplateRequest(List.of(items));
    }

    /** R-06: a product of another stall → 403, and nothing is deleted or written. */
    @Test
    void saveRejectsAProductOfAnotherFarmer() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        product(200, OTHER_FARMER_ID, "Cà chua", 5, ProductStatus.AVAILABLE);
        template(100, 0, 10, null);

        assertThatThrownBy(
                        () ->
                                service.saveTemplates(
                                        USER_ID,
                                        items(
                                                new TemplateItem(100L, 0, 10, null),
                                                new TemplateItem(200L, 0, 10, null))))
                .isInstanceOf(ProductNotYoursException.class);
        verify(templates, never()).deleteByFarmerId(anyLong());
        verify(templates, never()).saveAll(any());
        assertThat(table).hasSize(1);
    }

    @Test
    void saveReplacesTheWholeSetForThatFarmer() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        product(101, FARMER_ID, "Cải ngọt", 5, ProductStatus.AVAILABLE);
        for (int day = 0; day < 5; day++) {
            template(100, day, 10, null);
        }

        service.saveTemplates(
                USER_ID,
                items(new TemplateItem(100L, 6, 30, null), new TemplateItem(101L, 0, 12, null)));

        assertThat(table)
                .extracting(WeeklyStockTemplate::getProductId, WeeklyStockTemplate::getDayOfWeek)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(100L, 6),
                        org.assertj.core.groups.Tuple.tuple(101L, 0));
    }

    /** The same product twice on the same weekday is ambiguous → 400, nothing written. */
    @Test
    void saveRejectsTheSameProductAndDayTwice() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);

        assertThatThrownBy(
                        () ->
                                service.saveTemplates(
                                        USER_ID,
                                        items(
                                                new TemplateItem(100L, 0, 10, null),
                                                new TemplateItem(100L, 0, 12, null))))
                .isInstanceOf(IllegalArgumentException.class);
        verify(templates, never()).saveAll(any());
    }

    /** A soft-deleted product cannot get a template → 404, like every other farmer product path. */
    @Test
    void saveRejectsADeletedProduct() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE).setDeleted(true);

        assertThatThrownBy(
                        () ->
                                service.saveTemplates(
                                        USER_ID, items(new TemplateItem(100L, 0, 10, null))))
                .isInstanceOf(ProductNotFoundException.class);
        verify(templates, never()).saveAll(any());
    }

    @Test
    void applySetsStockFromTheTemplateOfThatWeekday() {
        Product sundayOnly = product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        Product saturdayOnly = product(101, FARMER_ID, "Cải ngọt", 7, ProductStatus.AVAILABLE);
        template(100, 0, 30, null);
        template(101, 6, 20, null);

        ApplyTemplateResultResource result = service.applyTemplate(USER_ID, SUNDAY);

        assertThat(sundayOnly.getStockQuantity()).isEqualTo(30);
        assertThat(saturdayOnly.getStockQuantity()).isEqualTo(7);
        assertThat(result.productsUpdated()).isEqualTo(1);
    }

    @Test
    void applyOverwritesStockItDoesNotAddToIt() {
        Product p = product(100, FARMER_ID, "Rau muống", 3, ProductStatus.AVAILABLE);
        template(100, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        assertThat(p.getStockQuantity()).isEqualTo(30);
    }

    @Test
    void applyAlsoRevivesSoldOutProducts() {
        Product p = product(100, FARMER_ID, "Rau muống", 0, ProductStatus.SOLD_OUT);
        template(100, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        assertThat(p.getStatus()).isEqualTo(ProductStatus.AVAILABLE);
    }

    @Test
    void applySkipsProductsWithNoTemplateForThatDay() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        Product untouched = product(101, FARMER_ID, "Cải ngọt", 7, ProductStatus.AVAILABLE);
        template(100, 0, 30, null);

        ApplyTemplateResultResource result = service.applyTemplate(USER_ID, SUNDAY);

        assertThat(result.skipped()).containsExactly("Cải ngọt");
        assertThat(untouched.getStockQuantity()).isEqualTo(7);
    }

    /**
     * FR-064: "unavailable" is the farmer's pause — the template refills stock but keeps the pause.
     */
    @Test
    void applyKeepsAPausedProductPaused() {
        Product p = product(100, FARMER_ID, "Rau muống", 0, ProductStatus.UNAVAILABLE);
        template(100, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        assertThat(p.getStockQuantity()).isEqualTo(30);
        assertThat(p.getStatus()).isEqualTo(ProductStatus.UNAVAILABLE);
    }

    @Test
    void applyingZeroMarksAnAvailableProductSoldOut() {
        Product p = product(100, FARMER_ID, "Rau muống", 8, ProductStatus.AVAILABLE);
        template(100, 0, 0, null);

        service.applyTemplate(USER_ID, SUNDAY);

        assertThat(p.getStockQuantity()).isZero();
        assertThat(p.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
    }

    /** default_price NULL keeps the current price (db/schema.sql §4). */
    @Test
    void applySetsThePriceOnlyWhenTheTemplateHasOne() {
        Product priced = product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        Product kept = product(101, FARMER_ID, "Cải ngọt", 5, ProductStatus.AVAILABLE);
        template(100, 0, 30, new BigDecimal("15000"));
        template(101, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        assertThat(priced.getPrice()).isEqualByComparingTo("15000");
        assertThat(kept.getPrice()).isEqualByComparingTo("20000");
    }

    /** C5-14: stock writes go through the row lock, so an order in flight cannot be overwritten. */
    @Test
    void applyLoadsTheProductsThroughTheRowLock() {
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);
        template(100, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        verify(products)
                .lockAllById(
                        org.mockito.ArgumentMatchers.argThat(
                                ids -> List.copyOf(ids).equals(List.of(100L))));
        verify(products, never()).findAllById(any());
    }

    /** FR-041: a refill from zero reaches the restock alert. */
    @Test
    void applyAlertsFavouritesWhenAnEmptyProductIsRefilled() {
        Product p = product(100, FARMER_ID, "Rau muống", 0, ProductStatus.SOLD_OUT);
        template(100, 0, 30, null);

        service.applyTemplate(USER_ID, SUNDAY);

        org.mockito.Mockito.verify(restock).afterChange(p, false);
    }

    private void suspended() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(FARMER_ID)
                                        .userId(USER_ID)
                                        .stallName("Vườn Út Hiền")
                                        .contactPerson("Hiền")
                                        .approvalStatus(ApprovalStatus.SUSPENDED)
                                        .build()));
    }

    /** Contract §4 / D-09: a stall that is not approved cannot edit stock or prices → 403. */
    @Test
    void saveRejectsAStallThatIsNotApproved() {
        suspended();
        product(100, FARMER_ID, "Rau muống", 5, ProductStatus.AVAILABLE);

        assertThatThrownBy(
                        () ->
                                service.saveTemplates(
                                        USER_ID, items(new TemplateItem(100L, 0, 10, null))))
                .isInstanceOf(StallNotApprovedException.class);
        verify(templates, never()).saveAll(any());
    }

    @Test
    void applyRejectsAStallThatIsNotApproved() {
        suspended();
        Product p = product(100, FARMER_ID, "Rau muống", 3, ProductStatus.AVAILABLE);
        template(100, 0, 30, null);

        assertThatThrownBy(() -> service.applyTemplate(USER_ID, SUNDAY))
                .isInstanceOf(StallNotApprovedException.class);
        assertThat(p.getStockQuantity()).isEqualTo(3);
    }
}
