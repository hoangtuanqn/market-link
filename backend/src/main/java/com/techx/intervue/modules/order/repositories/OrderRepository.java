package com.techx.intervue.modules.order.repositories;

import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.enums.OrderStatus;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    boolean existsByOrderCode(String orderCode);

    List<Order> findByCustomerIdAndStatusIn(Long customerId, Collection<OrderStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id")
    Optional<Order> lockById(@Param("id") Long id);

    long countByMarketIdAndPickupDateAndStatusNot(
            Long marketId, LocalDate pickupDate, OrderStatus excludedStatus);
}
