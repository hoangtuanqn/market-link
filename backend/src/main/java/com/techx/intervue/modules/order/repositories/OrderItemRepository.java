package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {}
