package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.PickupSlot;
import com.techx.intervue.modules.stall.resources.SlotResource;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Slots a customer may see: of a stall still selling at a market that is still open. JdbcTemplate
 * because market_id is needed from farmer_markets in the same read; every value goes through
 * parameters (R-04).
 */
@Repository
@RequiredArgsConstructor
public class SlotQueryRepository {

    public static final String PUBLIC_SLOTS =
            """
            SELECT s.id, s.farmer_market_id, fm.market_id, s.slot_date, s.start_time, s.end_time,
                   s.max_orders, s.booked_count
            FROM pickup_slots s
            JOIN farmer_markets fm ON fm.id = s.farmer_market_id AND fm.is_active = TRUE
            JOIN markets m ON m.id = fm.market_id AND m.is_active = TRUE
            WHERE fm.farmer_id = :farmerId
              AND s.is_active = TRUE
              AND (:marketId IS NULL OR fm.market_id = :marketId)
              AND s.slot_date BETWEEN :fromDate AND :toDate
            ORDER BY s.slot_date, s.start_time, fm.market_id
            """;

    private final NamedParameterJdbcTemplate jdbc;

    public List<SlotResource> publicSlots(
            long farmerId, Long marketId, LocalDate from, LocalDate to) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("farmerId", farmerId)
                        .addValue("marketId", marketId)
                        .addValue("fromDate", from)
                        .addValue("toDate", to);
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
