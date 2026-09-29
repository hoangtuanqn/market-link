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

@Component
@AllArgsConstructor
public class ProductAvailabilityResolver {

    static final int LOOKAHEAD_DAYS = 14;

    private final WeeklyStockTemplateRepository templates;
    private final ProductDailyStockRepository dailyStock;
    private final ProductRepository products;
    private final SlotQueryRepository slots;
    private final Clock clock;

    public record Deal(
            BigDecimal listPrice, int discountPercent, LocalDate packedOn, LocalDate bestBefore) {}

    public record Availability(LocalDate date, int quantity, BigDecimal price, Deal deal) {

        public Availability(LocalDate date, int quantity, BigDecimal price) {
            this(date, quantity, price, null);
        }
    }

    public Map<Long, Availability> resolve(Map<Long, BigDecimal> basePriceByProductId) {
        Map<Long, Availability> result = new HashMap<>();
        if (basePriceByProductId.isEmpty()) {
            return result;
        }
        LocalDate today = LocalDate.now(clock);
        Map<Long, Long> farmerOf =
                products.findAllById(basePriceByProductId.keySet()).stream()
                        .collect(Collectors.toMap(Product::getId, Product::getFarmerId));
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
                    continue;
                }
                Availability a = resolveOne(productId, date, active, entry.getValue());
                if (found == null) {
                    found = a;
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

    public List<Availability> upcoming(Product product) {
        LocalDate today = LocalDate.now(clock);
        Set<LocalDate> open =
                slots.orderableDates(
                                Set.of(product.getFarmerId()),
                                today,
                                today.plusDays(LOOKAHEAD_DAYS - 1),
                                LocalDateTime.now(clock))
                        .getOrDefault(product.getFarmerId(), Set.of());
        List<WeeklyStockTemplate> active = templates.findByProductIdAndActiveTrue(product.getId());
        return candidateDates(today, active).stream()
                .filter(open::contains)
                .map(date -> resolveOne(product.getId(), date, active, product.getPrice()))
                .toList();
    }

    public Map<Long, Availability> onDate(
            long farmerId, Map<Long, BigDecimal> basePriceByProductId, LocalDate date) {
        Map<Long, Availability> result = new HashMap<>();
        LocalDate today = LocalDate.now(clock);
        if (date.isBefore(today) || date.isAfter(today.plusDays(LOOKAHEAD_DAYS - 1))) {
            return result;
        }
        Set<LocalDate> open =
                slots.orderableDates(Set.of(farmerId), date, date, LocalDateTime.now(clock))
                        .getOrDefault(farmerId, Set.of());
        if (!open.contains(date)) {
            return result;
        }
        basePriceByProductId.forEach(
                (productId, basePrice) ->
                        lookup(
                                        productId,
                                        date,
                                        templates.findByProductIdAndActiveTrue(productId),
                                        basePrice)
                                .ifPresent(a -> result.put(productId, a)));
        return result;
    }

    private Availability resolveOne(
            Long productId,
            LocalDate date,
            List<WeeklyStockTemplate> active,
            BigDecimal basePrice) {
        return lookup(productId, date, active, basePrice).orElseThrow();
    }

    private Optional<Availability> lookup(
            Long productId,
            LocalDate date,
            List<WeeklyStockTemplate> active,
            BigDecimal basePrice) {
        Optional<ProductDailyStock> existing =
                dailyStock.findByProductIdAndStockDate(productId, date);
        if (existing.isPresent()) {
            return Optional.of(fromRow(date, existing.get()));
        }
        int dayOfWeek = date.getDayOfWeek().getValue() % 7;
        return active.stream()
                .filter(t -> t.getDayOfWeek() == dayOfWeek)
                .findFirst()
                .map(
                        t ->
                                new Availability(
                                        date,
                                        t.getDefaultQuantity(),
                                        t.getDefaultPrice() != null
                                                ? t.getDefaultPrice()
                                                : basePrice));
    }

    private static Availability fromRow(LocalDate date, ProductDailyStock row) {
        Deal deal =
                row.hasDeal()
                        ? new Deal(
                                row.getListPrice(),
                                row.getDiscountPercent(),
                                row.getPackedOn(),
                                row.getBestBefore())
                        : null;
        return new Availability(date, row.getQuantityAvailable(), row.getUnitPrice(), deal);
    }

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
