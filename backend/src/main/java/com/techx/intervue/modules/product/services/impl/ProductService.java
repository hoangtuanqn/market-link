package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
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
import java.util.List;
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
    private final RestockNotifier restock;

    @Override
    public PageResource<FarmerProductResource> mine(
            long userId, String status, int page, int pageSize) {
        FarmerProfile profile = mine(userId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        String dbStatus = status == null || status.isBlank() ? null : parseStatus(status).value();
        return query.mine(profile.getId(), dbStatus, (safePage - 1) * safeSize, safeSize);
    }

    /**
     * Read-only, outside a transaction: reads without the row lock that {@link #owned} takes (a
     * PESSIMISTIC_WRITE query needs a transaction), with the same 404 / 403.
     */
    @Override
    public FarmerProductResource mineOne(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        Product product =
                requireOwner(
                        profile,
                        products.findByIdAndDeletedFalse(productId)
                                .orElseThrow(() -> new ProductNotFoundException(productId)));
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

    /**
     * {@code stockQuantity} here is a reference number only — actual availability is per pickup
     * date ({@code product_daily_stock}, D-02 redesign) and comes from the weekly template, not
     * from this field. Editing it (or anything else {@link ProductRequest} carries) never changes
     * {@link ProductStatus} and is never a restock event.
     */
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

    /** Soft delete — order_items point to product_id, old orders must stay readable (FR-036). */
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
     * FR-064: sold out / paused is a state the Farmer sets themself; stock and the admin's hide
     * flag do not change.
     */
    @Override
    @Transactional
    public FarmerProductResource setStatus(long userId, long productId, ProductStatus status) {
        FarmerProfile profile = mine(userId);
        requireApproved(profile);
        Product product = owned(profile, productId);
        boolean wasOrderable = restock.isOrderable(product);
        product.setStatus(status);
        Product saved = products.save(product);
        // FR-041: lifting a pause or a manual "sold out" can make it orderable again
        restock.afterChange(saved, wasOrderable, restock.isOrderable(saved));
        return toResource(saved, profile, categories.findById(saved.getCategoryId()).orElse(null));
    }

    @Override
    @Transactional
    public void adminHide(long productId, String reason) {
        Product product = locked(productId);
        product.setHidden(true);
        product.setHiddenReason(reason.trim());
        products.save(product);
    }

    @Override
    @Transactional
    public void adminUnhide(long productId) {
        Product product = locked(productId);
        boolean wasOrderable = restock.isOrderable(product);
        product.setHidden(false);
        product.setHiddenReason(null);
        Product saved = products.save(product);
        restock.afterChange(saved, wasOrderable, restock.isOrderable(saved));
    }

    /**
     * R-06: the profile is always looked up by the token's userId; there is no path that takes a
     * farmerId from the request.
     */
    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }

    /** D-09 / contract §4: when not approved or suspended, every product write is blocked. */
    private static void requireApproved(FarmerProfile profile) {
        if (profile.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new StallNotApprovedException();
        }
    }

    /**
     * D-02 / Review Focus #1 by another path (Task 5.3b, Ruling C5-14): a Farmer/Admin editing a
     * product must lock the same row that {@code OrderService.place} locks, never read an unlocked
     * snapshot and then {@code save()} — Hibernate has no {@code @DynamicUpdate}, so the UPDATE
     * rewrites every column, including a {@code stock_quantity} an order deducted while it was
     * being read. {@code deleted} is filtered here (after locking) to keep the 404 that {@code
     * findByIdAndDeletedFalse} used to give, not in the SQL.
     */
    private Product owned(FarmerProfile profile, long productId) {
        return requireOwner(profile, notDeleted(productId));
    }

    private static Product requireOwner(FarmerProfile profile, Product product) {
        if (!product.getFarmerId().equals(profile.getId())) {
            throw new ProductNotYoursException();
        }
        return product;
    }

    private Product notDeleted(long productId) {
        Product product = locked(productId);
        if (product.isDeleted()) {
            throw new ProductNotFoundException(productId);
        }
        return product;
    }

    /**
     * C5-2: locks one product through {@code lockAllById} — the same locking path {@code
     * OrderService} uses.
     */
    private Product locked(long productId) {
        return products.lockAllById(List.of(productId)).stream()
                .findFirst()
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

    /**
     * An unknown or disabled category → 400 attached to the categoryId field, so the form marks the
     * right box.
     */
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
