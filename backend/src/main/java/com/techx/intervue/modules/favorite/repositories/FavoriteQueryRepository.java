package com.techx.intervue.modules.favorite.repositories;

import com.techx.intervue.modules.favorite.enums.FavoriteTargetType;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Favourites with what the Favorites screen shows about each target, in one query. JdbcTemplate
 * because it joins stalls, products and markets; every value goes through parameters (R-04).
 */
@Repository
@RequiredArgsConstructor
public class FavoriteQueryRepository {

    /**
     * available: a stall is approved; a product is on sale (not deleted, not hidden, available,
     * stock left) at an approved stall; a market is open.
     */
    public static final String LIST_SQL =
            """
            SELECT fv.id, fv.target_type, fv.target_id,
                   CASE fv.target_type
                        WHEN 'farmer' THEN fp.stall_name
                        WHEN 'product' THEN p.name
                        ELSE m.market_name END AS title,
                   CASE fv.target_type
                        WHEN 'farmer' THEN fp.contact_person
                        WHEN 'product' THEN pf.stall_name
                        ELSE m.address END AS subtitle,
                   CASE fv.target_type
                        WHEN 'farmer' THEN fp.logo_url
                        WHEN 'product' THEN p.image_url
                        ELSE m.image_url END AS image_url,
                   CASE fv.target_type
                        WHEN 'farmer' THEN fp.approval_status = 'approved'
                        WHEN 'product' THEN p.is_deleted = FALSE AND p.is_hidden = FALSE
                                            AND p.status = 'available' AND p.stock_quantity > 0
                                            AND pf.approval_status = 'approved'
                        ELSE m.is_active = TRUE END AS available
            FROM favorites fv
            LEFT JOIN farmer_profiles fp ON fv.target_type = 'farmer' AND fp.id = fv.farmer_id
            LEFT JOIN products p ON fv.target_type = 'product' AND p.id = fv.product_id
            LEFT JOIN farmer_profiles pf ON pf.id = p.farmer_id
            LEFT JOIN markets m ON fv.target_type = 'market' AND m.id = fv.market_id
            WHERE fv.customer_id = :customerId
              AND (:type IS NULL OR fv.target_type = :type)
              AND (:favoriteId IS NULL OR fv.id = :favoriteId)
            ORDER BY fv.created_at DESC, fv.id DESC
            """;

    private static final RowMapper<FavoriteResource> ROW =
            (rs, i) ->
                    new FavoriteResource(
                            rs.getLong("id"),
                            rs.getString("target_type"),
                            rs.getLong("target_id"),
                            rs.getString("title"),
                            rs.getString("subtitle"),
                            rs.getString("image_url"),
                            rs.getBoolean("available"));

    private final NamedParameterJdbcTemplate jdbc;

    public List<FavoriteResource> list(long customerId, FavoriteTargetType type) {
        return jdbc.query(LIST_SQL, params(customerId, type, null), ROW);
    }

    public Optional<FavoriteResource> one(long customerId, long favoriteId) {
        return jdbc.query(LIST_SQL, params(customerId, null, favoriteId), ROW).stream().findFirst();
    }

    private static MapSqlParameterSource params(
            long customerId, FavoriteTargetType type, Long favoriteId) {
        return new MapSqlParameterSource()
                .addValue("customerId", customerId)
                .addValue("type", type == null ? null : type.value())
                .addValue("favoriteId", favoriteId);
    }
}
