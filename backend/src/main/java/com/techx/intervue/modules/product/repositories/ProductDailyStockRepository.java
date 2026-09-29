package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.ProductDailyStock;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
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

    @Modifying
    @Transactional
    @Query(
            value =
                    """
                    INSERT INTO product_daily_stock (product_id, stock_date, quantity_available, unit_price)
                    SELECT :productId, :stockDate, t.default_quantity, COALESCE(t.default_price, p.price)
                    FROM weekly_stock_templates t JOIN products p ON p.id = t.product_id
                    WHERE t.product_id = :productId AND t.day_of_week = :dayOfWeek AND t.is_active = TRUE AND p.is_deleted = FALSE
                    ON DUPLICATE KEY UPDATE product_daily_stock.id = product_daily_stock.id
                    """,
            nativeQuery = true)
    int materialize(
            @Param("productId") Long productId,
            @Param("stockDate") LocalDate stockDate,
            @Param("dayOfWeek") int dayOfWeek);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            "select d from ProductDailyStock d where d.productId = :productId and d.stockDate ="
                    + " :stockDate")
    Optional<ProductDailyStock> lockByProductIdAndStockDate(
            @Param("productId") Long productId, @Param("stockDate") LocalDate stockDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            "select d from ProductDailyStock d where d.productId = :productId and d.stockDate >="
                    + " :from order by d.stockDate")
    List<ProductDailyStock> lockFrom(
            @Param("productId") Long productId, @Param("from") LocalDate from);
}
