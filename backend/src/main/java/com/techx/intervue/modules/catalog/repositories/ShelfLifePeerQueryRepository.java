package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.product.repositories.ProductQueryRepository;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * FR-120: the shelf lives other stalls set, per guide — the "other stalls usually set N days" hint.
 * Only products on sale count (spec §4.1): the same filter as the public pages, {@link
 * ProductQueryRepository#VISIBILITY_FILTER} (not deleted, not hidden, stall approved, an active
 * weekly stock template).
 */
@Repository
@RequiredArgsConstructor
public class ShelfLifePeerQueryRepository {

    static final String PEER_DAYS_SQL =
            """
            SELECT p.shelf_life_guide_id AS guide_id, p.shelf_life_days AS days
            FROM products p
            JOIN farmer_profiles f ON f.id = p.farmer_id
            WHERE p.shelf_life_guide_id IN (:guideIds)
              AND (:excludeFarmerId IS NULL OR p.farmer_id <> :excludeFarmerId)
            """
                    + ProductQueryRepository.VISIBILITY_FILTER;

    private final NamedParameterJdbcTemplate jdbc;

    /** Guide id → the shelf lives set on its products; {@code excludeFarmerId} null counts all. */
    public Map<Long, List<Integer>> daysByGuide(Collection<Long> guideIds, Long excludeFarmerId) {
        Map<Long, List<Integer>> out = new HashMap<>();
        if (guideIds.isEmpty()) {
            return out;
        }
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("guideIds", guideIds)
                        .addValue("excludeFarmerId", excludeFarmerId);
        jdbc.query(
                PEER_DAYS_SQL,
                params,
                rs -> {
                    out.computeIfAbsent(rs.getLong("guide_id"), k -> new ArrayList<>())
                            .add(rs.getInt("days"));
                });
        return out;
    }
}
