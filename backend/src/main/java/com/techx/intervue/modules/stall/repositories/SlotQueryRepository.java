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
     * Per product, the dates that still have at least one bookable slot of its stall — what
     * "orderable on that date" means for the nearest-date stock number (FR-031). A full slot still
     * counts: capacity is checked when the order is placed.
     */
    private static final String BOOKABLE_DATES =
            "SELECT DISTINCT p.id AS product_id, b.slot_date\n"
                    + "FROM products p\n"
                    + "JOIN (SELECT fm.farmer_id, s.slot_date\n"
                    + BOOKABLE_FROM
                    + """
                      AND fm.farmer_id IN (SELECT p2.farmer_id FROM products p2
                                           WHERE p2.id IN (:productIds))
                    ) b ON b.farmer_id = p.farmer_id
                    WHERE p.id IN (:productIds)
                    """;

    private final NamedParameterJdbcTemplate jdbc;

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

    /** See {@link #BOOKABLE_DATES}; a product with no such date is absent from the map. */
    public Map<Long, Set<LocalDate>> bookableDates(
            Collection<Long> productIds, LocalDate from, LocalDate to, LocalDateTime now) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("productIds", productIds)
                        .addValue("fromDate", from)
                        .addValue("toDate", to)
                        .addValue("now", now);
        Map<Long, Set<LocalDate>> dates = new HashMap<>();
        jdbc.query(
                BOOKABLE_DATES,
                params,
                rs -> {
                    dates.computeIfAbsent(rs.getLong("product_id"), k -> new HashSet<>())
                            .add(rs.getObject("slot_date", LocalDate.class));
                });
        return dates;
    }
}
