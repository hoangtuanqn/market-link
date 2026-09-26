package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.enums.ProductStatus;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.ApplyTemplateResultResource;
import com.techx.intervue.modules.product.resources.StockTemplateItemResource;
import com.techx.intervue.modules.product.services.interfaces.StockTemplateServiceInterface;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-063 — a stall keeps one quantity (and optionally a price) per product and weekday, then
 * refills its stock for a market day in one click. Everything is looked up from the token's user
 * (R-06).
 */
@Service
@AllArgsConstructor
public class StockTemplateService implements StockTemplateServiceInterface {

    private final WeeklyStockTemplateRepository templates;
    private final ProductRepository products;
    private final FarmerProfileRepository farmers;

    @Override
    @Transactional(readOnly = true)
    public List<StockTemplateItemResource> getTemplates(long userId) {
        return toResources(mine(userId));
    }

    /**
     * Replaces the stall's whole set. Every product is checked before anything is deleted, so a
     * rejected request leaves the old set in place.
     */
    @Override
    @Transactional
    public List<StockTemplateItemResource> saveTemplates(
            long userId, StockTemplateRequest request) {
        FarmerProfile profile = mine(userId);
        List<StockTemplateRequest.TemplateItem> items = request.items();

        Set<String> seen = new HashSet<>();
        for (StockTemplateRequest.TemplateItem item : items) {
            if (!seen.add(item.productId() + "@" + item.dayOfWeek())) {
                throw new IllegalArgumentException(
                        "Each product can have one template per weekday.");
            }
        }
        Set<Long> ids =
                items.stream()
                        .map(StockTemplateRequest.TemplateItem::productId)
                        .collect(Collectors.toSet());
        Map<Long, Product> byId =
                products.findAllById(ids).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        for (Long id : ids) {
            Product p = byId.get(id);
            if (p == null || p.isDeleted()) {
                throw new ProductNotFoundException(id);
            }
            if (!p.getFarmerId().equals(profile.getId())) {
                throw new ProductNotYoursException();
            }
        }

        templates.deleteByFarmerId(profile.getId());
        // Hibernate orders INSERT before DELETE on flush; without this, saving a row that already
        // existed would hit uq_template.
        templates.flush();
        List<WeeklyStockTemplate> rows = new ArrayList<>();
        for (StockTemplateRequest.TemplateItem item : items) {
            WeeklyStockTemplate t = new WeeklyStockTemplate();
            t.setFarmerId(profile.getId());
            t.setProductId(item.productId());
            t.setDayOfWeek(item.dayOfWeek());
            t.setDefaultQuantity(item.defaultQuantity());
            t.setDefaultPrice(item.defaultPrice());
            t.setActive(true);
            rows.add(t);
        }
        templates.saveAll(rows);
        return toResources(profile);
    }

    /**
     * Sets stock to the template's quantity (it does not add to it). Rows are loaded through the
     * row lock (C5-14) so an order placed at the same moment cannot be overwritten.
     */
    @Override
    @Transactional
    public ApplyTemplateResultResource applyTemplate(long userId, LocalDate targetDate) {
        FarmerProfile profile = mine(userId);
        // 0 = Sunday … 6 = Saturday; Java's DayOfWeek is Monday = 1 … Sunday = 7
        int day = targetDate.getDayOfWeek().getValue() % 7;
        Map<Long, WeeklyStockTemplate> forDay =
                templates.findByFarmerIdAndDayOfWeekAndActiveTrue(profile.getId(), day).stream()
                        .collect(
                                Collectors.toMap(
                                        WeeklyStockTemplate::getProductId, Function.identity()));

        int updated = 0;
        if (!forDay.isEmpty()) {
            for (Product p : products.lockAllById(new TreeSet<>(forDay.keySet()))) {
                if (p.isDeleted() || !p.getFarmerId().equals(profile.getId())) {
                    continue;
                }
                WeeklyStockTemplate t = forDay.get(p.getId());
                p.setStockQuantity(t.getDefaultQuantity());
                if (t.getDefaultPrice() != null) {
                    p.setPrice(t.getDefaultPrice());
                }
                refreshStatus(p);
                updated++;
            }
        }

        List<String> skipped =
                products.findByFarmerIdAndDeletedFalse(profile.getId()).stream()
                        .filter(p -> !forDay.containsKey(p.getId()))
                        .map(Product::getName)
                        .toList();
        return new ApplyTemplateResultResource(updated, skipped);
    }

    /**
     * FR-064: "unavailable" is the farmer's own pause and is never changed here; otherwise stock
     * decides between available and sold out.
     */
    private static void refreshStatus(Product p) {
        if (p.getStatus() == ProductStatus.UNAVAILABLE) {
            return;
        }
        p.setStatus(p.getStockQuantity() > 0 ? ProductStatus.AVAILABLE : ProductStatus.SOLD_OUT);
    }

    private List<StockTemplateItemResource> toResources(FarmerProfile profile) {
        Map<Long, Product> own =
                products.findByFarmerIdAndDeletedFalse(profile.getId()).stream()
                        .collect(Collectors.toMap(Product::getId, Function.identity()));
        return templates.findByFarmerId(profile.getId()).stream()
                .filter(t -> own.containsKey(t.getProductId()))
                .sorted(
                        Comparator.comparing(WeeklyStockTemplate::getProductId)
                                .thenComparing(WeeklyStockTemplate::getDayOfWeek))
                .map(
                        t -> {
                            Product p = own.get(t.getProductId());
                            return new StockTemplateItemResource(
                                    p.getId(),
                                    p.getName(),
                                    p.getUnit(),
                                    t.getDayOfWeek(),
                                    t.getDefaultQuantity(),
                                    t.getDefaultPrice());
                        })
                .toList();
    }

    /** R-06: the profile always comes from the token's user id. */
    private FarmerProfile mine(long userId) {
        return farmers.findByUserId(userId).orElseThrow(FarmerProfileNotFoundException::new);
    }
}
