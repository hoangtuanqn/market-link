package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class StockTemplateServiceTest {

    private static final long USER_ID = 1L;
    private static final long FARMER_ID = 10L;
    private static final long OTHER_FARMER_ID = 2L;
    private static final long PRODUCT_ID = 100L;

    private WeeklyStockTemplateRepository templates;
    private ProductRepository products;
    private FarmerProfileRepository farmers;
    private StockTemplateService service;

    @BeforeEach
    void setUp() {
        templates = mock(WeeklyStockTemplateRepository.class);
        products = mock(ProductRepository.class);
        farmers = mock(FarmerProfileRepository.class);
        service = new StockTemplateService(templates, products, farmers);
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

    /** Đọc lịch không cần stall đã duyệt, giống {@code ProductService.mineOne}. */
    @Test
    void listReturnsTemplatesEvenWhenStallSuspended() {
        when(farmers.findByUserId(USER_ID))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));
        StockTemplateResource resource =
                new StockTemplateResource(PRODUCT_ID, "Rau muống", 1, 50, new BigDecimal("2.00"));
        when(templates.findResourcesByFarmerId(FARMER_ID)).thenReturn(List.of(resource));

        List<StockTemplateResource> result = service.list(USER_ID);

        assertThat(result).containsExactly(resource);
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

    private static StockTemplateRequest oneItemRequest(
            int dayOfWeek, int quantity, BigDecimal price) {
        return new StockTemplateRequest(
                List.of(new StockTemplateRequest.Item(PRODUCT_ID, dayOfWeek, quantity, price)));
    }
}
