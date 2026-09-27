package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.resources.SlotResource;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Slots a customer may see: of a stall still selling at a market that is still open, on a weekday
 * both the market and the stall still open ({@link PickupSlotRepository#OPEN_DAYS}), and still
 * before their cutoff (start − the stall's order_cutoff_hours, the same rule placing an order
 * enforces with 409 CUTOFF_PASSED). JdbcTemplate because market_id is needed from farmer_markets in
 * the same read; every value goes through parameters (R-04).
 */
@Repository
@RequiredArgsConstructor
public class SlotQueryRepository {

    /** The single definition of "a slot a customer can still book", shared by both reads below. */
    private static final String BOOKABLE_FROM =
            """
            FROM pickup_slots s
            JOIN farmer_markets fm ON fm.id = s.farmer_market_id AND fm.is_active = TRUE
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            JOIN farmer_profiles f ON f.id = fm.farmer_id
            WHERE s.is_active = TRUE
              AND s.slot_date BETWEEN :fromDate AND :toDate
              AND TIMESTAMP(s.slot_date, s.start_time) - INTERVAL f.order_cutoff_hours HOUR > :now
            """
                    + PickupSlotRepository.OPEN_DAYS;

    public static final String PUBLIC_SLOTS =
            """
            SELECT s.id, s.farmer_market_id, fm.market_id, s.slot_date, s.start_time, s.end_time,
                   s.max_orders, s.booked_count
            """
                    + BOOKABLE_FROM
                    + """
                      AND fm.farmer_id = :farmerId
                      AND (:marketId IS NULL OR fm.market_id = :marketId)
                    ORDER BY s.slot_date, s.start_time, fm.market_id
                    """;

    /**
     * Dates a customer can still order for, per stall: at least one slot with room left that is
     * still before its cutoff — the same conditions as {@link #PUBLIC_SLOTS} plus a free place,
     * i.e. what placing an order accepts.
     */
    public static final String ORDERABLE_DATES =
            "SELECT DISTINCT fm.farmer_id, s.slot_date\n"
                    + BOOKABLE_FROM
                    + """
                      AND fm.farmer_id IN (:farmerIds)
                      AND s.booked_count < s.max_orders
                    """;

    private final NamedParameterJdbcTemplate jdbc;

    /** Stall id → the dates between {@code from} and {@code to} it can still take an order for. */
    public Map<Long, Set<LocalDate>> orderableDates(
            Collection<Long> farmerIds, LocalDate from, LocalDate to, LocalDateTime now) {
        Map<Long, Set<LocalDate>> out = new HashMap<>();
        if (farmerIds.isEmpty()) {
            return out;
        }
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerIds", farmerIds)
                        .addValue("fromDate", from)
                        .addValue("toDate", to)
                        .addValue("now", now);
        jdbc.query(
                ORDERABLE_DATES,
                params,
                rs -> {
                    out.computeIfAbsent(rs.getLong("farmer_id"), k -> new HashSet<>())
                            .add(rs.getObject("slot_date", LocalDate.class));
                });
        return out;
    }

    public List<SlotResource> publicSlots(
            long farmerId, Long marketId, LocalDate from, LocalDate to, LocalDateTime now) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("marketId", marketId)
                        .addValue("fromDate", from)
                        .addValue("toDate", to)
                        .addValue("now", now);
        return jdbc.query(
                PUBLIC_SLOTS,
                params,
                (rs, i) -> {
                    PickupSlot slot = new PickupSlot();
                    slot.setId(rs.getLong("id"));
                    slot.setFarmerMarketId(rs.getLong("farmer_market_id"));
                    slot.setSlotDate(rs.getObject("slot_date", LocalDate.class));
                    slot.setStartTime(rs.getTime("start_time").toLocalTime());
                    slot.setEndTime(rs.getTime("end_time").toLocalTime());
                    slot.setMaxOrders(rs.getInt("max_orders"));
                    slot.setBookedCount(rs.getInt("booked_count"));
                    slot.setActive(true);
                    return SlotResource.of(slot, rs.getLong("market_id"));
                });
    }
}
