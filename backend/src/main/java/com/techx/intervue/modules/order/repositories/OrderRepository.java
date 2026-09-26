package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.enums.OrderStatus;
import java.time.LocalDate;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** C5-6: OrderCodeGenerator asks before inserting; UNIQUE(order_code) is the last backstop. */
    boolean existsByOrderCode(String orderCode);

    /** Admin closed-days panel: a cancelled order does not count as "affected". */
    long countByMarketIdAndPickupDateAndStatusNot(
            Long marketId, LocalDate pickupDate, OrderStatus excludedStatus);
}
