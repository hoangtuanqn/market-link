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

    /**
     * FR-032, FR-060, FR-073: a slot is only offered or booked while the market is still held on
     * its weekday ({@code market_operating_days}) and the stall still attends that weekday at that
     * market ({@code farmer_operating_days}). Slots are generated weeks ahead, so either side can
     * drop a weekday after its slots exist. The slot must also still fit inside the stall's time
     * window for that weekday (FR-067): shortening or moving the window leaves the slots already
     * generated outside it, and those no longer take bookings either. Both tables store 0 = Sunday
     * … 6 = Saturday; MySQL's DAYOFWEEK is 1 = Sunday … 7 = Saturday. Needs the aliases {@code s}
     * (pickup_slots) and {@code fm} (farmer_markets); {@link SlotQueryRepository} pastes the same
     * fragment in.
     */
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

    /**
     * Locks the slot row until the transaction ends (D-06). Placing an order (C5) and editing
     * capacity both go through here, so max_orders cannot be lowered below booked_count while an
     * order is holding a spot.
     */
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

    /**
     * Whether the slot's weekday is still open for both its market and its stall, inside the
     * stall's time window (see above).
     */
    default boolean isOnOpenDay(long slotId) {
        return countOnOpenDay(slotId) > 0;
    }
}
