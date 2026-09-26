package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.OrderStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {}
