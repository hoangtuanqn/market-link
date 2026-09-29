package com.techx.intervue.modules.product.services.impl;

import com.techx.intervue.modules.product.entities.Product;
import com.techx.intervue.modules.product.entities.ProductDailyStock;
import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.repositories.ProductDailyStockRepository;
import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-062, FR-063 — keeps the pickup days that already have a {@code product_daily_stock} row in
 * step with a new product price or weekly template. A row is created once from the template and
 * wins over it from then on ({@link ProductAvailabilityResolver}), so without this a new price or
 * quantity only reached days nobody had looked at yet.
 *
 * <p>Only a row that still carries what the old numbers gave it follows: a day the Farmer set by
 * hand (FR-063 override) or put on a near-expiry deal (FR-124) keeps its own numbers. The units
 * orders already took stay taken — a following day gets the new quota minus what is sold, never
 * below 0 — and orders keep the unit price they copied. A weekday dropped from the template is a
 * quota of 0: that day takes no new order. Every method runs inside the caller's transaction.
 */
@Component
@AllArgsConstructor
public class DailyStockTemplateSync {

    /** One weekday of a product's weekly template; {@code price} null = the product's price. */
    public record DayPlan(int quantity, BigDecimal price) {

        static DayPlan of(WeeklyStockTemplate t) {
            return new DayPlan(t.getDefaultQuantity(), t.getDefaultPrice());
        }

        BigDecimal priceOr(BigDecimal productPrice) {
            return price != null ? price : productPrice;
        }
    }

    private final ProductDailyStockRepository dailyStock;
    private final ProductQueryRepository query;
    private final Clock clock;

    /** 0 = Sunday … 6 = Saturday → that weekday's plan, the shape the template stores. */
    public static Map<Integer, DayPlan> plans(List<WeeklyStockTemplate> templates) {
        return templates.stream()
                .filter(WeeklyStockTemplate::isActive)
                .collect(
                        Collectors.toMap(
                                WeeklyStockTemplate::getDayOfWeek, DayPlan::of, (a, b) -> b));
    }

    /**
     * Locks the product's rows from today on (C5-2). Call it before anything else in the
     * transaction reads them: a row read earlier without the lock would come back stale.
     */
    public List<ProductDailyStock> lockUpcoming(long productId) {
        return dailyStock.lockFrom(productId, LocalDate.now(clock));
    }

    /**
     * The product's price changed from {@code oldPrice}: every upcoming day still sold at that
     * price, on a weekday whose template has no price of its own, takes the new one.
     */
    public void followPrice(
            Product product, BigDecimal oldPrice, List<WeeklyStockTemplate> active) {
        if (oldPrice.compareTo(product.getPrice()) == 0) {
            return;
        }
        Map<Integer, DayPlan> plans = plans(active);
        for (ProductDailyStock row : lockUpcoming(product.getId())) {
            DayPlan plan = plans.get(dayOfWeek(row.getStockDate()));
            boolean pricedByProduct = plan == null || plan.price() == null;
            if (!row.hasDeal() && pricedByProduct && row.getUnitPrice().compareTo(oldPrice) == 0) {
                row.setUnitPrice(product.getPrice());
                dailyStock.save(row);
            }
        }
    }

    /**
     * The product's weekly template went from {@code before} to {@code after}; {@code rows} are the
     * ones {@link #lockUpcoming} locked. A row on a weekday the old template did not cover has
     * nothing of its own to keep and follows the new one.
     */
    public void followTemplate(
            Product product,
            List<ProductDailyStock> rows,
            Map<Integer, DayPlan> before,
            Map<Integer, DayPlan> after) {
        if (rows.isEmpty()) {
            return;
        }
        Map<LocalDate, Integer> sold = query.soldFrom(product.getId(), LocalDate.now(clock));
        for (ProductDailyStock row : rows) {
            if (row.hasDeal()) {
                continue;
            }
            int day = dayOfWeek(row.getStockDate());
            DayPlan was = before.get(day);
            DayPlan now = after.get(day);
            if (samePlan(was, now)) {
                continue; // this weekday did not change: a day set by hand stays as it is
            }
            int taken = sold.getOrDefault(row.getStockDate(), 0);
            boolean changed = false;
            if (was == null || row.getQuantityAvailable() + taken == was.quantity()) {
                int quota = now == null ? 0 : now.quantity();
                int left = Math.max(0, quota - taken);
                changed = left != row.getQuantityAvailable();
                row.setQuantityAvailable(left);
            }
            if (now != null
                    && (was == null
                            || row.getUnitPrice().compareTo(was.priceOr(product.getPrice()))
                                    == 0)) {
                BigDecimal price = now.priceOr(product.getPrice());
                changed |= price.compareTo(row.getUnitPrice()) != 0;
                row.setUnitPrice(price);
            }
            if (changed) {
                dailyStock.save(row);
            }
        }
    }

    /** BigDecimal.equals is scale-sensitive (0.5 ≠ 0.50), so prices compare by value. */
    private static boolean samePlan(DayPlan a, DayPlan b) {
        if (a == null || b == null) {
            return a == b;
        }
        boolean samePrice =
                a.price() == null
                        ? b.price() == null
                        : b.price() != null && a.price().compareTo(b.price()) == 0;
        return a.quantity() == b.quantity() && samePrice;
    }

    private static int dayOfWeek(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7;
    }
}
