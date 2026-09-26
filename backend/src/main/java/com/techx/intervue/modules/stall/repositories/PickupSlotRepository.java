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
     * Khoá dòng slot tới hết transaction (D-06). Đặt đơn (C5) và sửa sức chứa cùng đi qua đây, nên
     * không thể hạ max_orders xuống dưới booked_count trong lúc một đơn đang giữ chỗ.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from PickupSlot s where s.id = :id")
    Optional<PickupSlot> lockById(@Param("id") Long id);
}
