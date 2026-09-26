package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.PickupSlot;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PickupSlotRepository extends JpaRepository<PickupSlot, Long> {

    List<PickupSlot> findByFarmerMarketIdAndSlotDateBetween(
            Long farmerMarketId, LocalDate from, LocalDate to);

    /**
     * Locks the slot row until the transaction ends (D-06). Placing an order (C5) and editing
     * capacity both go through here, so max_orders cannot be lowered below booked_count while an
     * order is holding a spot.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from PickupSlot s where s.id = :id")
    Optional<PickupSlot> lockById(@Param("id") Long id);
}
