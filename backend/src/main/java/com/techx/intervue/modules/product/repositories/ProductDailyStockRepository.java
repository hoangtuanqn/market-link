package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProductDailyStockRepository extends JpaRepository<ProductDailyStock, Long> {

    Optional<ProductDailyStock> findByProductIdAndStockDate(Long productId, LocalDate stockDate);

    /**
     * Creates the row for (product, date) if it doesn't exist yet, seeded from the template
     * matching {@code dayOfWeek} that is still active; no matching template inserts nothing at all
     * — that date simply is not orderable (see
     * docs/superpowers/specs/2026-09-26-product-daily-stock-design.md). Safe when two transactions
     * call this at the same time thanks to UNIQUE(product_id, stock_date): whoever gets there first
     * wins, the other is a no-op (ON DUPLICATE KEY UPDATE id = id changes nothing).
     */
    @Modifying
    @Transactional
    @Query(
            value =
                    """
                    INSERT INTO product_daily_stock (product_id, stock_date, quantity_available, unit_price)
                    SELECT :productId, :stockDate, t.default_quantity, COALESCE(t.default_price, p.price)
                    FROM weekly_stock_templates t JOIN products p ON p.id = t.product_id
                    WHERE t.product_id = :productId AND t.day_of_week = :dayOfWeek AND t.is_active = TRUE
                    ON DUPLICATE KEY UPDATE product_daily_stock.id = product_daily_stock.id
                    """,
            nativeQuery = true)
    int materialize(
            @Param("productId") Long productId,
            @Param("stockDate") LocalDate stockDate,
            @Param("dayOfWeek") int dayOfWeek);

    /**
     * Locks the rows already guaranteed to exist (via {@code materialize} then a lookup) until
     * commit.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from ProductDailyStock d where d.id in :ids order by d.id")
    List<ProductDailyStock> lockAllById(@Param("ids") Collection<Long> ids);
}
