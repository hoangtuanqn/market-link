package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.WeeklyStockTemplateRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
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
 * at most 14 days ahead; no orderable date within that window means the product is omitted.
 */
@Component
@AllArgsConstructor
public class ProductAvailabilityResolver {

    private static final int LOOKAHEAD_DAYS = 14;

    private final WeeklyStockTemplateRepository templates;
    private final ProductDailyStockRepository dailyStock;
    private final Clock clock;

    public record Availability(LocalDate date, int quantity, BigDecimal price) {}

    public Map<Long, Availability> resolve(Map<Long, BigDecimal> basePriceByProductId) {
        LocalDate today = LocalDate.now(clock);
        Map<Long, Availability> result = new HashMap<>();
        for (Map.Entry<Long, BigDecimal> entry : basePriceByProductId.entrySet()) {
            Long productId = entry.getKey();
            List<WeeklyStockTemplate> active = templates.findByProductIdAndActiveTrue(productId);
            nearestDate(today, active)
                    .ifPresent(
                            date ->
                                    result.put(
                                            productId,
                                            resolveOne(productId, date, active, entry.getValue())));
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
     * The closest date from {@code today} onward (today itself counts) whose weekday matches an
     * active template.
     */
    static Optional<LocalDate> nearestDate(LocalDate today, List<WeeklyStockTemplate> templates) {
        if (templates.isEmpty()) {
            return Optional.empty();
        }
        Set<Integer> activeDays =
                templates.stream()
                        .map(WeeklyStockTemplate::getDayOfWeek)
                        .collect(Collectors.toSet());
        for (int i = 0; i < LOOKAHEAD_DAYS; i++) {
            LocalDate candidate = today.plusDays(i);
            if (activeDays.contains(candidate.getDayOfWeek().getValue() % 7)) {
                return Optional.of(candidate);
            }
        }
        return Optional.empty();
    }
}
