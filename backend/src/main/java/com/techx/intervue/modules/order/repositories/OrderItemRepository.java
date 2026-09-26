package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.OrderItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    /**
     * Task 5.5: the item lines of an order, to restore stock by exactly the ordered quantity
     * (D-02).
     */
    List<OrderItem> findByOrderId(Long orderId);
}
