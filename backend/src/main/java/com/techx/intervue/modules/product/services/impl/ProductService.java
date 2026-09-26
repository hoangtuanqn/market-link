package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.util.Locale;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class ProductService implements ProductServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final ProductRepository products;
    private final FarmerProfileRepository farmers;
    private final CategoryRepository categories;
    private final ProductQueryRepository query;

    @Override
    public PageResource<FarmerProductResource> mine(
            long userId, String status, int page, int pageSize) {
        FarmerProfile profile = mine(userId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        String dbStatus = status == null || status.isBlank() ? null : parseStatus(status).value();
        return query.mine(profile.getId(), dbStatus, (safePage - 1) * safeSize, safeSize);
    }

    @Override
    public FarmerProductResource mineOne(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        Product product = owned(profile, productId);
        return toResource(
                product, profile, categories.findById(product.getCategoryId()).orElse(null));
    }

    @Override
    @Transactional
    public FarmerProductResource create(long userId, ProductRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Category category = activeCategory(request.categoryId());
        Product product = new Product();
        product.setFarmerId(profile.getId());
        apply(product, request, category);
        return toResource(products.save(product), profile, category);
    }

    @Override
    @Transactional
    public FarmerProductResource update(long userId, long productId, ProductRequest request) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product = owned(profile, productId);
        Category category = activeCategory(request.categoryId());
        apply(product, request, category);
        return toResource(products.save(product), profile, category);
    }

    /** Xoá mềm — order_items trỏ tới product_id, đơn cũ phải đọc lại được (FR-036). */
    @Override
    @Transactional
    public void softDelete(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product = owned(profile, productId);
        product.setDeleted(true);
        products.save(product);
    }

    /**
     * FR-064: sold out / tạm ngưng là trạng thái Farmer tự đặt; tồn kho và cờ ẩn của admin không
     * đổi.
     */
    @Override
    @Transactional
    public FarmerProductResource setStatus(long userId, long productId, ProductStatus status) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product = owned(profile, productId);
        product.setStatus(status);
        Product saved = products.save(product);
        return toResource(saved, profile, categories.findById(saved.getCategoryId()).orElse(null));
    }

    @Override
    @Transactional
    public void adminHide(long productId, String reason) {
        Product product =
                products.findById(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        product.setHidden(true);
        product.setHiddenReason(reason.trim());
        products.save(product);
    }

    @Override
    @Transactional
    public void adminUnhide(long productId) {
        Product product =
                products.findById(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        product.setHidden(false);
        product.setHiddenReason(null);
        products.save(product);
    }

    /** R-06: hồ sơ luôn tra theo userId của token; không có đường nào nhận farmerId từ request. */
    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    /** D-09 / contract §4: chưa duyệt hoặc bị đình chỉ thì mọi thao tác ghi sản phẩm bị chặn. */
    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }

    private Product owned(FarmerProfile profile, long productId) {
        Product product =
                products.findByIdAndDeletedFalse(productId)
                        .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }
        return product;
    }

    /** Danh mục lạ hoặc đã tắt → 400 gắn vào field categoryId, để form đánh dấu đúng ô. */
    private Category activeCategory(Long categoryId) {
        return categories
                .findById(categoryId)
                .filter(Category::isActive)
                .orElseThrow(
                        () ->
                                new InvalidFieldException(
                                        "categoryId", "Choose a category from the list."));
    }

    private static ProductStatus parseStatus(String raw) {
        try {
            return ProductStatus.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Unknown status. Use available, sold_out or unavailable.");
        }
    }

    private static void apply(Product product, ProductRequest request, Category category) {
        product.setCategoryId(category.getId());
        product.setName(request.name().trim());
        product.setDescription(
                request.description() == null || request.description().isBlank()
                        ? null
                        : request.description().trim());
        product.setPrice(request.price());
        product.setUnit(request.unit().trim());
        product.setStockQuantity(request.stockQuantity());
        product.setImageUrl(
                request.imageUrl() == null || request.imageUrl().isBlank()
                        ? null
                        : request.imageUrl().trim());
        product.setShelfLifeDays(request.shelfLifeDays());
    }

    private static FarmerProductResource toResource(
            Product p, FarmerProfile profile, Category category) {
        ProductListItemResource item =
                new ProductListItemResource(
                        p.getId(),
                        p.getName(),
                        profile.getId(),
                        profile.getStallName(),
                        null,
                        null,
                        p.getCategoryId(),
                        category == null ? null : category.getName(),
                        p.getPrice(),
                        p.getUnit(),
                        p.getStockQuantity(),
                        p.getImageUrl(),
                        p.getStatus().value(),
                        p.getRatingAvg(),
                        p.getRatingCount(),
                        p.getShelfLifeDays());
        return new FarmerProductResource(
                item, p.getDescription(), p.isHidden(), p.getHiddenReason());
    }
}
