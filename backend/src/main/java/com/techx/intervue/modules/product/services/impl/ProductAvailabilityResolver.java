package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import com.techx.intervue.modules.stall.repositories.SlotQueryRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * "Nearest orderable date" for read-only pages (cart preview, product browse/search) — never
 * materializes a {@code product_daily_stock} row, only reads. See
 * docs/superpowers/specs/2026-09-26-product-daily-stock-design.md, section "Browse / search". Looks
 * at most 14 days ahead; no orderable date within that window means the product is omitted. A date
 * already sold out is skipped for the next one that still has stock — only when every date is sold
 * out does the nearest one come back, with 0.
 *
 * <p>"Orderable" means the stall still has a slot with room on that date before its cutoff, on a
 * weekday the market and the stall both still open — the dates placing an order accepts. Without
 * that check today (past its cutoff) was shown with the template's fresh quantity while orders went
 * to a later date, so the stock on screen never went down after a sale.
 */
@Component
@AllArgsConstructor
public class ProductAvailabilityResolver {

    private static final int LOOKAHEAD_DAYS = 14;

    private final WeeklyStockTemplateRepository templates;
    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final SlotQueryRepository slots;
    private final Clock clock;

    public record Availability(LocalDate date, int quantity, BigDecimal price) {}

    public Map<Long, Availability> resolve(Map<Long, BigDecimal> basePriceByProductId) {
        Map<Long, Availability> result = new HashMap<>();
        if (basePriceByProductId.isEmpty()) {
            return result;
        }
        LocalDate today = LocalDate.now(clock);
        Map<Long, Long> farmerOf =
                products.findAllById(basePriceByProductId.keySet()).stream()
                        .collect(Collectors.toMap(Product::getId, Product::getFarmerId));
        // One query for every stall involved, not one per product
        Map<Long, Set<LocalDate>> orderable =
                slots.orderableDates(
                        Set.copyOf(farmerOf.values()),
                        today,
                        today.plusDays(LOOKAHEAD_DAYS - 1),
                        LocalDateTime.now(clock));
        for (Map.Entry<Long, BigDecimal> entry : basePriceByProductId.entrySet()) {
            Long productId = entry.getKey();
            Set<LocalDate> open = orderable.getOrDefault(farmerOf.get(productId), Set.of());
            List<WeeklyStockTemplate> active = templates.findByProductIdAndActiveTrue(productId);
            Availability found = null;
            for (LocalDate date : candidateDates(today, active)) {
                if (!open.contains(date)) {
                    continue; // no slot left before its cutoff: nobody can order for this date
                }
                Availability a = resolveOne(productId, date, active, entry.getValue());
                if (found == null) {
                    found = a; // the nearest date, kept in case every date is sold out
                }
                if (a.quantity() > 0) {
                    found = a;
                    break;
                }
            }
            if (found != null) {
                result.put(productId, found);
            }
        }
        return result;
    }

    private Availability resolveOne(
            Long productId,
            LocalDate date,
            List<WeeklyStockTemplate> active,
            BigDecimal basePrice) {
        Optional<ProductDailyStock> existing =
                dailyStock.findByProductIdAndStockDate(productId, date);
        if (existing.isPresent()) {
            ProductDailyStock row = existing.get();
            return new Availability(date, row.getQuantityAvailable(), row.getUnitPrice());
        }
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        WeeklyStockTemplate template =
                active.stream()
                        .filter(t -> t.getDayOfWeek() == dayOfWeek)
                        .findFirst()
                        .orElseThrow();
        BigDecimal price =
                template.getDefaultPrice() != null ? template.getDefaultPrice() : basePrice;
        return new Availability(date, template.getDefaultQuantity(), price);
    }

    /**
     * Every date from {@code today} onward (today itself counts) inside the lookahead whose weekday
     * matches an active template, nearest first.
     */
    static List<LocalDate> candidateDates(LocalDate today, List<WeeklyStockTemplate> templates) {
        Set<Integer> activeDays =
                templates.stream()
                        .map(WeeklyStockTemplate::getDayOfWeek)
                        .collect(Collectors.toSet());
        List<LocalDate> dates = new ArrayList<>();
        for (int i = 0; i < LOOKAHEAD_DAYS; i++) {
            LocalDate candidate = today.plusDays(i);
            if (activeDays.contains(candidate.getDayOfWeek().getValue() % 7)) {
                dates.add(candidate);
            }
        }
        return dates;
    }
}
