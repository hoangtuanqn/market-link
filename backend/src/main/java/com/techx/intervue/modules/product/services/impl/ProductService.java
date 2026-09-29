package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.catalog.entities.Category;
import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.repositories.CategoryRepository;
import com.techx.intervue.modules.catalog.repositories.ShelfLifeGuideRepository;
import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.farmer.services.impl.StallSuspensionMessage;
import com.techx.intervue.modules.favorite.services.impl.RestockNotifier;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.modules.product.resources.ProductListItemResource;
import com.techx.intervue.modules.product.resources.ShelfLifeResource;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
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
    private final ProductAvailabilityResolver availability;
    private final WeeklyStockTemplateRepository templates;
    private final ShelfLifeGuideRepository shelfLifeGuides;
    private final Clock clock;
    private final ShelfLifeStandingServiceInterface shelfLifeStanding;
    private final DailyStockTemplateSync dailyStockSync;

    @Override
    public PageResource<FarmerProductResource> mine(
            long userId, String status, int page, int pageSize) {
        FarmerProfile profile = mine(userId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        String dbStatus = status == null || status.isBlank() ? null : parseStatus(status).value();
        PageResource<FarmerProductResource> rows =
                query.mine(profile.getId(), dbStatus, (safePage - 1) * safeSize, safeSize);
        return new PageResource<>(
                withNextDate(rows.items()), rows.page(), rows.pageSize(), rows.total());
    }

    private List<FarmerProductResource> withNextDate(List<FarmerProductResource> rows) {
        Map<Long, BigDecimal> prices =
                rows.stream()
                        .collect(
                                Collectors.toMap(
                                        r -> r.item().id(), r -> r.item().price(), (a, b) -> a));
        Map<Long, ProductAvailabilityResolver.Availability> next = availability.resolve(prices);
        Map<Long, Integer> reserved =
                query.reservedOn(
                        next.entrySet().stream()
                                .collect(
                                        Collectors.toMap(
                                                Map.Entry::getKey, e -> e.getValue().date())));
        return rows.stream()
                .map(
                        r -> {
                            ProductAvailabilityResolver.Availability a = next.get(r.item().id());
                            return a == null
                                    ? r
                                    : r.withNextDate(
                                            a.date().toString(),
                                            a.quantity(),
                                            reserved.getOrDefault(r.item().id(), 0));
                        })
                .toList();
    }

    @Override
    public FarmerProductResource mineOne(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        Product product =
                requireOwner(
                        profile,
                        products.findByIdAndDeletedFalse(productId)
                                .orElseThrow(() -> new ProductNotFoundException(productId)));
        return toResource(
                product,
                profile,
                categories.findById(product.getCategoryId()).orElse(null),
                guideOf(product));
    }

    @Override
    @Transactional
    public FarmerProductResource create(long userId, ProductRequest request) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);
        Category category = activeCategory(request.categoryId());
        Product product = new Product();
        product.setFarmerId(profile.getId());
        apply(product, request, category);
        ShelfLifeGuide guide = applyShelfLife(product, request, category);
        return toResource(products.save(product), profile, category, guide);
    }

    @Override
    @Transactional
    public FarmerProductResource update(long userId, long productId, ProductRequest request) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);
        Product product = owned(profile, productId);
        Category category = activeCategory(request.categoryId());
        BigDecimal oldPrice = product.getPrice();
        apply(product, request, category);
        ShelfLifeGuide guide = applyShelfLife(product, request, category);
        Product saved = products.save(product);
        dailyStockSync.followPrice(
                saved, oldPrice, templates.findByProductIdAndActiveTrue(saved.getId()));
        return toResource(saved, profile, category, guide);
    }

    @Override
    @Transactional
    public void softDelete(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);
        Product product = owned(profile, productId);
        product.setDeleted(true);
        products.save(product);
        templates.deleteByProductId(productId);
    }

    @Override
    @Transactional
    public FarmerProductResource setStatus(long userId, long productId, ProductStatus status) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);
        Product product = owned(profile, productId);
        boolean wasOrderable = restock.isOrderable(product);
        product.setStatus(status);
        Product saved = products.save(product);
        restock.afterChange(saved, wasOrderable, restock.isOrderable(saved));
        return toResource(
                saved,
                profile,
                categories.findById(saved.getCategoryId()).orElse(null),
                guideOf(saved));
    }

    @Override
    public PageResource<FarmerProductResource> adminHidden(int page, int pageSize) {
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return query.hidden((safePage - 1) * safeSize, safeSize);
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

    @Override
    public PageResource<FarmerProductResource> mineDeleted(long userId, int page, int pageSize) {
        FarmerProfile profile = mine(userId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return query.mineDeleted(profile.getId(), (safePage - 1) * safeSize, safeSize);
    }

    @Override
    @Transactional
    public FarmerProductResource restore(long userId, long productId) {
        FarmerProfile profile = mine(userId);
        StallSuspensionMessage.assertUsable(profile);
        Product product = requireOwner(profile, locked(productId));
        if (product.isDeleted()) {
            product.setDeleted(false);
            product.setStatus(ProductStatus.UNAVAILABLE);
            products.save(product);
        }
        Category category = categories.findById(product.getCategoryId()).orElse(null);
        return toResource(product, profile, category, guideOf(product));
    }

    private FarmerProfile mine(long userId) {
        FarmerProfile profile =
                farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
        StallSuspensionMessage.assertUsable(profile);
        return profile;
    }

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

    private Product locked(long productId) {
        return products.lockAllById(List.of(productId)).stream()
                .findFirst()
                .orElseThrow(() -> new ProductNotFoundException(productId));
    }

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
    }

    private ShelfLifeGuide applyShelfLife(
            Product product, ProductRequest request, Category category) {
        int days = request.shelfLifeDays();
        ShelfLifeGuide guide = null;
        StorageMode mode;
        int suggested;
        if (request.shelfLifeGuideId() != null) {
            guide =
                    shelfLifeGuides
                            .findById(request.shelfLifeGuideId())
                            .filter(ShelfLifeGuide::isActive)
                            .filter(g -> g.getCategoryId().equals(category.getId()))
                            .orElseThrow(
                                    () ->
                                            new InvalidFieldException(
                                                    "shelfLifeGuideId",
                                                    "Choose a group from this category."));
            mode = guide.getStorageMode();
            if (request.storageMode() != null && StorageMode.parse(request.storageMode()) != mode) {
                throw new InvalidFieldException(
                        "storageMode", "This group cannot be sold that way.");
            }
            suggested = guide.getSuggestedDays();
        } else {
            if (!shelfLifeGuides
                    .findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(
                            category.getId())
                    .isEmpty()) {
                throw new InvalidFieldException(
                        "shelfLifeGuideId", "Choose a group from this category.");
            }
            mode =
                    request.storageMode() == null
                            ? StorageMode.ROOM
                            : StorageMode.parse(request.storageMode());
            suggested = category.getMaxShelfLifeDays();
        }
        int max = ShelfLifePolicy.maxDays(suggested);
        if (days > max) {
            throw new InvalidFieldException(
                    "shelfLifeDays", "At most " + max + " days for this group.");
        }
        boolean extended = ShelfLifePolicy.extendedBy(days, suggested) > 0;
        if (extended) {
            shelfLifeStanding.requireCanExtend(product.getFarmerId());
        }
        if (extended && !Boolean.TRUE.equals(request.acknowledgeLongerShelfLife())) {
            throw new InvalidFieldException(
                    "acknowledgeLongerShelfLife",
                    "Confirm that the product stays good for the longer time.");
        }
        Long guideId = guide == null ? null : guide.getId();
        boolean samePromise =
                product.isShelfLifeExtended()
                        && product.getShelfLifeAckAt() != null
                        && Objects.equals(product.getShelfLifeGuideId(), guideId)
                        && product.getStorageMode() == mode
                        && product.getShelfLifeDays() == days;
        LocalDateTime promisedAt =
                samePromise ? product.getShelfLifeAckAt() : LocalDateTime.now(clock);
        product.setShelfLifeDays(days);
        product.setShelfLifeGuideId(guideId);
        product.setStorageMode(mode);
        product.setSuggestedShelfLifeDays(suggested);
        product.setShelfLifeExtended(extended);
        product.setShelfLifeAckAt(extended ? promisedAt : null);
        return guide;
    }

    private ShelfLifeGuide guideOf(Product product) {
        return product.getShelfLifeGuideId() == null
                ? null
                : shelfLifeGuides.findById(product.getShelfLifeGuideId()).orElse(null);
    }

    private static FarmerProductResource toResource(
            Product p, FarmerProfile profile, Category category, ShelfLifeGuide guide) {
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
                        p.getShelfLifeDays(),
                        null);
        return new FarmerProductResource(
                item, p.getDescription(), p.isHidden(), p.getHiddenReason(), shelfLifeOf(p, guide));
    }

    static ShelfLifeResource shelfLifeOf(Product p, ShelfLifeGuide guide) {
        return new ShelfLifeResource(
                p.getShelfLifeGuideId(),
                guide == null ? null : guide.getGroupName(),
                p.getStorageMode().value(),
                p.getShelfLifeDays(),
                p.getSuggestedShelfLifeDays(),
                p.isShelfLifeExtended());
    }
}
