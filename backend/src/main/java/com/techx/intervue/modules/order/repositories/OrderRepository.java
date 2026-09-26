package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.Order;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /** C5-6: OrderCodeGenerator hỏi trước khi insert; UNIQUE(order_code) là lưới cuối. */
    boolean existsByOrderCode(String orderCode);

    /**
     * C5-8 (Task 5.5): mọi đường đổi trạng thái / huỷ / sửa đơn nạp đơn qua đây trước tiên
     * (PESSIMISTIC_WRITE), trước cả khoá slot / sản phẩm (C5-2) — hai yêu cầu đổi cùng một đơn
     * không chồng nhau, và không đọc dòng đơn trước khi khoá.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> lockById(@Param("id") Long id);
}
