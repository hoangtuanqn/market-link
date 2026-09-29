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

@Component
@AllArgsConstructor
public class DailyStockTemplateSync {

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

    public static Map<Integer, DayPlan> plans(List<WeeklyStockTemplate> templates) {
        return templates.stream()
                .filter(WeeklyStockTemplate::isActive)
                .collect(
                        Collectors.toMap(
                                WeeklyStockTemplate::getDayOfWeek, DayPlan::of, (a, b) -> b));
    }

    public List<ProductDailyStock> lockUpcoming(long productId) {
        return dailyStock.lockFrom(productId, LocalDate.now(clock));
    }

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
                continue;
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
