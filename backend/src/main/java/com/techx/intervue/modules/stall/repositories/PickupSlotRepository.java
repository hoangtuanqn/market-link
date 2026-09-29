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

    String OPEN_DAYS =
            """
              AND EXISTS (SELECT 1 FROM market_operating_days mo
                          WHERE mo.market_id = fm.market_id
                            AND mo.day_of_week = DAYOFWEEK(s.slot_date) - 1)
              AND EXISTS (SELECT 1 FROM farmer_operating_days od
                          WHERE od.farmer_market_id = fm.id
                            AND od.day_of_week = DAYOFWEEK(s.slot_date) - 1
                            AND s.start_time >= od.pickup_start_time
                            AND s.end_time <= od.pickup_end_time)
            """;

    List<PickupSlot> findByFarmerMarketIdAndSlotDateBetween(
            Long farmerMarketId, LocalDate from, LocalDate to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from PickupSlot s where s.id = :id")
    Optional<PickupSlot> lockById(@Param("id") Long id);

    @Query(
            value =
                    "SELECT COUNT(*) FROM pickup_slots s"
                            + " JOIN farmer_markets fm ON fm.id = s.farmer_market_id"
                            + " WHERE s.id = :slotId"
                            + OPEN_DAYS,
            nativeQuery = true)
    long countOnOpenDay(@Param("slotId") long slotId);

    default boolean isOnOpenDay(long slotId) {
        return countOnOpenDay(slotId) > 0;
    }
}
