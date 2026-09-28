package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ProductServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;

    /** 10:00 on 27/09/2026 in Ho Chi Minh City. */
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-09-27T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private CategoryRepository categories;
    private ProductQueryRepository query;
    private ProductService service;
    private RestockNotifier restock;
    private ShelfLifeGuideRepository shelfLifeGuides;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        categories = mock(CategoryRepository.class);
        query = mock(ProductQueryRepository.class);
        restock = mock(RestockNotifier.class);
        shelfLifeGuides = mock(ShelfLifeGuideRepository.class);
        service =
                new ProductService(
                        products,
                        farmers,
                        categories,
                        query,
                        restock,
                        mock(ProductAvailabilityResolver.class),
                        shelfLifeGuides,
                        CLOCK);
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

    private static Category leafyGreens() {
        Category c = new Category();
        c.setId(1L);
        c.setName("Leafy greens");
        c.setSlug("leafy-greens");
        c.setActive(true);
        c.setMinShelfLifeDays(1);
        c.setMaxShelfLifeDays(7);
        return c;
    }

    private static Product product(long farmerId) {
        Product p = new Product();
        p.setId(PRODUCT_ID);
        p.setFarmerId(farmerId);
        p.setCategoryId(1L);
        p.setName("Rau muống");
        p.setPrice(new BigDecimal("12000"));
        p.setUnit("bó");
        p.setStockQuantity(7);
        p.setStatus(ProductStatus.AVAILABLE);
        return p;
    }

    private static ProductRequest request() {
        return new ProductRequest(
                1L,
                "Rau muống",
                "Cắt sáng",
                new BigDecimal("12000"),
                "bó",
                40,
                null,
                4,
                null,
                null,
                null);
    }

    private static ProductRequest shelf(Long guideId, String mode, int days, Boolean ack) {
        return new ProductRequest(
                1L,
                "Rau muống",
                "Cắt sáng",
                new BigDecimal("0.50"),
                "bunch",
                40,
                null,
                days,
                guideId,
                mode,
                ack);
    }

    private static ShelfLifeGuide chilledLeafy(long categoryId, boolean active) {
        ShelfLifeGuide g = new ShelfLifeGuide();
        g.setId(7L);
        g.setCategoryId(categoryId);
        g.setGroupName("Leafy greens");
        g.setStorageMode(StorageMode.CHILLED);
        g.setSuggestedDays(3);
        g.setActive(active);
        return g;
    }

    private void approvedStall() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(categories.findById(1L)).thenReturn(Optional.of(leafyGreens()));
    }

    /**
     * D-09 / contract §4: not approved means it cannot be posted for sale — 403 with the right
     * sentence.
     */
    @Test
    void createRejectsStallNotApproved() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.PENDING)));

        assertThatThrownBy(() -> service.create(USER_ID, request()))
                .isInstanceOf(StallNotApprovedException.class)
                .hasMessageContaining("pending admin approval");
        verify(products, never()).save(any());
    }

    /**
     * Review focus #3: the examiner changes the id in the URL → 403, not 404 (someone else's order
     * really exists).
     */
    @Test
    void updateOnAnotherFarmersProductIs403() {
        approvedStall();
        when(products.lockAllById(List.of(PRODUCT_ID)))
                .thenReturn(List.of(product(OTHER_FARMER_ID)));

        assertThatThrownBy(() -> service.update(USER_ID, PRODUCT_ID, request()))
                .isInstanceOf(ProductNotYoursException.class);
        verify(products, never()).save(any());
    }

    @Test
    void softDeleteKeepsTheRow() {
        approvedStall();
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.softDelete(USER_ID, PRODUCT_ID);

        assertThat(p.isDeleted()).isTrue();
        verify(products).save(p);
        verify(products, never()).delete(any());
        verify(products, never()).deleteById(any());
    }

    /** FR-064: "sold out" is a status, not stock — two different concepts. */
    @Test
    void setStatusSoldOutDoesNotTouchStock() {
        approvedStall();
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.setStatus(USER_ID, PRODUCT_ID, ProductStatus.SOLD_OUT);

        assertThat(p.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
        assertThat(p.getStockQuantity()).isEqualTo(7);
    }

    @Test
    void createWithUnknownCategoryIs400() {
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(categories.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(USER_ID, request()))
                .isInstanceOf(InvalidFieldException.class)
                .hasFieldOrPropertyWithValue("field", "categoryId");
        verify(products, never()).save(any());
    }

    @Test
    void adminHideSetsReasonAndFlag() {
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.adminHide(PRODUCT_ID, "Ảnh không đúng sản phẩm.");

        assertThat(p.isHidden()).isTrue();
        assertThat(p.getHiddenReason()).isEqualTo("Ảnh không đúng sản phẩm.");
        verify(products).save(p);
    }

    /**
     * FR-074: only an admin can clear the hide flag; a Farmer changing the status does not touch
     * it.
     */
    @Test
    void farmerCannotUnhideWhatAdminHid() {
        approvedStall();
        Product p = product(FARMER_ID);
        p.setHidden(true);
        p.setHiddenReason("Vi phạm.");
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        assertThatCode(() -> service.setStatus(USER_ID, PRODUCT_ID, ProductStatus.AVAILABLE))
                .doesNotThrowAnyException();

        assertThat(p.isHidden()).isTrue();
        assertThat(p.getHiddenReason()).isEqualTo("Vi phạm.");
    }

    /**
     * A Farmer opens the edit form for their own product — does not require the stall to be
     * approved, like {@code mine()}.
     */
    @Test
    void mineOneReturnsOwnProductEvenWhenStallSuspended() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));
        when(categories.findById(1L)).thenReturn(Optional.of(leafyGreens()));
        Product p = product(FARMER_ID);
        when(products.findByIdAndDeletedFalse(PRODUCT_ID)).thenReturn(Optional.of(p));

        FarmerProductResource resource = service.mineOne(USER_ID, PRODUCT_ID);

        assertThat(resource.item().id()).isEqualTo(PRODUCT_ID);
    }

    /** Review focus #3, applied to GET: the examiner changes the id in the URL → 403, not 404. */
    @Test
    void mineOneOnAnotherFarmersProductIs403() {
        approvedStall();
        when(products.findByIdAndDeletedFalse(PRODUCT_ID))
                .thenReturn(Optional.of(product(OTHER_FARMER_ID)));

        assertThatThrownBy(() -> service.mineOne(USER_ID, PRODUCT_ID))
                .isInstanceOf(ProductNotYoursException.class);
    }

    /**
     * The Farmer's list skips soft-deleted products, but still shows hidden products with the
     * reason.
     */
    @Test
    void mineReturnsDeletedProductsNever() {
        assertThat(ProductQueryRepository.MINE_SQL).contains("p.is_deleted = FALSE");
        assertThat(ProductQueryRepository.MINE_SQL).doesNotContain("p.is_hidden = FALSE");
        when(farmers.findByUserId(USER_ID)).thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        when(query.mine(any(Long.class), any(), anyInt(), anyInt()))
                .thenReturn(new PageResource<>(List.of(), 1, 12, 0));

        service.mine(USER_ID, null, 1, 12);

        verify(query).mine(FARMER_ID, null, 0, 12);
    }

    // ---------- Task 5.3b (D-02, Review Focus #1 by another path): every write path must lock
    // the product row before reading it, never load it through an unlocked findById /
    // findByIdAndDeletedFalse — otherwise the transaction overwrites the stock that
    // OrderService.place just deducted.
    // ----------

    @Test
    void updateLoadsThroughTheLock() {
        approvedStall();
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.update(USER_ID, PRODUCT_ID, request());

        verify(products).lockAllById(List.of(PRODUCT_ID));
        verify(products, never()).findById(any());
        verify(products, never()).findByIdAndDeletedFalse(any());
    }

    @Test
    void softDeleteLoadsThroughTheLock() {
        approvedStall();
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.softDelete(USER_ID, PRODUCT_ID);

        verify(products).lockAllById(List.of(PRODUCT_ID));
        verify(products, never()).findById(any());
        verify(products, never()).findByIdAndDeletedFalse(any());
    }

    @Test
    void setStatusLoadsThroughTheLock() {
        approvedStall();
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.setStatus(USER_ID, PRODUCT_ID, ProductStatus.SOLD_OUT);

        verify(products).lockAllById(List.of(PRODUCT_ID));
        verify(products, never()).findById(any());
        verify(products, never()).findByIdAndDeletedFalse(any());
    }

    @Test
    void adminHideLoadsThroughTheLock() {
        Product p = product(FARMER_ID);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.adminHide(PRODUCT_ID, "Ảnh không đúng sản phẩm.");

        verify(products).lockAllById(List.of(PRODUCT_ID));
        verify(products, never()).findById(any());
        verify(products, never()).findByIdAndDeletedFalse(any());
    }

    @Test
    void adminUnhideLoadsThroughTheLock() {
        Product p = product(FARMER_ID);
        p.setHidden(true);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.adminUnhide(PRODUCT_ID);

        verify(products).lockAllById(List.of(PRODUCT_ID));
        verify(products, never()).findById(any());
        verify(products, never()).findByIdAndDeletedFalse(any());
    }

    // ---------- FR-041 restock ----------

    /**
     * {@code stockQuantity} is a reference number only since the per-date redesign (D-02): {@link
     * ProductStatus} does not react to it, and an edit is never a restock event — availability
     * lives in {@code product_daily_stock}, not on the product row.
     */
    @Test
    void updateDoesNotTouchStatusOrTellTheRestockNotifier() {
        approvedStall();
        Product p = product(FARMER_ID);
        p.setStockQuantity(0);
        p.setStatus(ProductStatus.SOLD_OUT);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));

        service.update(USER_ID, PRODUCT_ID, request());

        assertThat(p.getStockQuantity()).isEqualTo(40);
        assertThat(p.getStatus()).isEqualTo(ProductStatus.SOLD_OUT);
        verify(restock, never()).afterChange(any(), anyBoolean(), anyBoolean());
    }

    /** FR-041: lifting the farmer's pause makes an orderable product orderable again → alert. */
    @Test
    void unpausingAnOrderableProductTellsTheRestockNotifier() {
        approvedStall();
        Product p = product(FARMER_ID);
        p.setStatus(ProductStatus.UNAVAILABLE);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));
        when(restock.isOrderable(p)).thenReturn(false, true);

        service.setStatus(USER_ID, PRODUCT_ID, ProductStatus.AVAILABLE);

        verify(restock).afterChange(p, false, true);
    }

    /** FR-041: an admin un-hiding an orderable product makes it orderable again → alert. */
    @Test
    void adminUnhideTellsTheRestockNotifier() {
        Product p = product(FARMER_ID);
        p.setHidden(true);
        when(products.lockAllById(List.of(PRODUCT_ID))).thenReturn(List.of(p));
        when(restock.isOrderable(p)).thenReturn(false, true);

        service.adminUnhide(PRODUCT_ID);

        verify(restock).afterChange(p, false, true);
    }

    // ---------- shelf life (FR-121) ----------

    @Test
    void createTakesTheSuggestionFromTheChosenGroup() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 3, null));

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(captor.capture());
        Product p = captor.getValue();
        assertThat(p.getShelfLifeGuideId()).isEqualTo(7L);
        assertThat(p.getStorageMode()).isEqualTo(StorageMode.CHILLED);
        assertThat(p.getSuggestedShelfLifeDays()).isEqualTo(3);
        assertThat(p.isShelfLifeExtended()).isFalse();
        assertThat(p.getShelfLifeAckAt()).isNull();
        assertThat(saved.shelfLife().groupName()).isEqualTo("Leafy greens");
        assertThat(saved.shelfLife().storageMode()).isEqualTo("chilled");
    }

    @Test
    void createAllowsShorterThanSuggestedWithoutAPromise() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 2, null));

        assertThat(saved.shelfLife().days()).isEqualTo(2);
        assertThat(saved.shelfLife().extended()).isFalse();
    }

    @Test
    void createRefusesLongerThanSuggestedWithoutThePromise() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 5, false)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("acknowledgeLongerShelfLife");
    }

    @Test
    void createKeepsTheTimeOfThePromiseForLonger() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        FarmerProductResource saved = service.create(USER_ID, shelf(7L, "chilled", 5, true));

        ArgumentCaptor<Product> captor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(captor.capture());
        assertThat(captor.getValue().isShelfLifeExtended()).isTrue();
        assertThat(captor.getValue().getShelfLifeAckAt())
                .isEqualTo(LocalDateTime.of(2026, 9, 27, 10, 0));
        assertThat(saved.shelfLife().extended()).isTrue();
        assertThat(saved.shelfLife().suggestedDays()).isEqualTo(3);
    }

    @Test
    void createRefusesMoreThanTwiceTheSuggestion() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 7, true)))
                .isInstanceOf(InvalidFieldException.class)
                .hasMessage("At most 6 days for this group.")
                .extracting("field")
                .isEqualTo("shelfLifeDays");
    }

    @Test
    void createRefusesAGroupOfAnotherCategory() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(2L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    @Test
    void createRefusesATurnedOffGroup() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, false)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    @Test
    void createRefusesAWayOfKeepingTheGroupDoesNotHave() {
        approvedStall();
        when(shelfLifeGuides.findById(7L)).thenReturn(Optional.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(7L, "room", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("storageMode");
    }

    /** Ruling 5: once a category has groups, a product must pick one. */
    @Test
    void createNeedsAGroupWhenTheCategoryHasGroups() {
        approvedStall();
        when(shelfLifeGuides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(1L))
                .thenReturn(List.of(chilledLeafy(1L, true)));

        assertThatThrownBy(() -> service.create(USER_ID, shelf(null, "chilled", 3, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("shelfLifeGuideId");
    }

    /** Spec §4.1 fallback: no groups yet → the category's upper bound is the suggestion. */
    @Test
    void createWithoutGroupsUsesTheCategoryRange() {
        approvedStall();

        FarmerProductResource atMax = service.create(USER_ID, shelf(null, "room", 7, null));
        assertThat(atMax.shelfLife().suggestedDays()).isEqualTo(7);
        assertThat(atMax.shelfLife().extended()).isFalse();
        assertThat(atMax.shelfLife().groupName()).isNull();

        assertThatThrownBy(() -> service.create(USER_ID, shelf(null, "room", 8, null)))
                .isInstanceOf(InvalidFieldException.class)
                .extracting("field")
                .isEqualTo("acknowledgeLongerShelfLife");
    }
}
