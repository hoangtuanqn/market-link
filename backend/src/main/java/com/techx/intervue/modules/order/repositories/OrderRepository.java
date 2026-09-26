package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** C5-6: OrderCodeGenerator hỏi trước khi insert; UNIQUE(order_code) là lưới cuối. */
    boolean existsByOrderCode(String orderCode);
}
