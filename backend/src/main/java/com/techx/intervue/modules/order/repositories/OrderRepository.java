package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** C5-6: OrderCodeGenerator asks before inserting; UNIQUE(order_code) is the last backstop. */
    boolean existsByOrderCode(String orderCode);

    /**
     * C5-8 (Task 5.5): mọi đường đổi trạng thái / huỷ / sửa đơn nạp đơn qua đây trước tiên
     * (PESSIMISTIC_WRITE), trước cả khoá slot / sản phẩm (C5-2) — hai yêu cầu đổi cùng một đơn
     * không chồng nhau, và không đọc dòng đơn trước khi khoá.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> lockById(@Param("id") Long id);

    /** Admin closed-days panel: a cancelled order does not count as "affected". */
    long countByMarketIdAndPickupDateAndStatusNot(
            Long marketId, LocalDate pickupDate, OrderStatus excludedStatus);
}
