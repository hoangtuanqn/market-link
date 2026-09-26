package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProductServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;

    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private CategoryRepository categories;
    private ProductQueryRepository query;
    private ProductService service;

    @BeforeEach
    void setUp() {
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        categories = mock(CategoryRepository.class);
        query = mock(ProductQueryRepository.class);
        service = new ProductService(products, farmers, categories, query);
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
                1L, "Rau muống", "Cắt sáng", new BigDecimal("12000"), "bó", 40, null, 4);
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

    // ---------- Task 5.3b (D-02, Review Focus #1 bằng đường khác): mọi đường ghi phải khoá
    // dòng sản phẩm trước khi đọc, không được nạp qua findById / findByIdAndDeletedFalse không
    // khoá — nếu không, transaction ghi đè lên bản tồn kho vừa bị OrderService.place trừ.
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
}
