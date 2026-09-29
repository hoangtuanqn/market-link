package com.techx.intervue.modules.geo.repositories;

import com.techx.intervue.modules.geo.resources.CountryResource;
import com.techx.intervue.modules.geo.resources.ProvinceResource;
import com.techx.intervue.modules.geo.resources.StreetResource;
import com.techx.intervue.modules.geo.resources.WardRow;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Reads the address master data of V20260927001. The first three lists are small and read once
 * (GeoDirectory keeps them); only the street search runs per request.
 */
@Repository
@RequiredArgsConstructor
public class GeoQueryRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public List<CountryResource> countries() {
        return jdbc.query(
                "SELECT code, name_en FROM countries ORDER BY name_en",
                (rs, i) -> new CountryResource(rs.getString("code"), rs.getString("name_en")));
    }

    public List<ProvinceResource> provinces() {
        return jdbc.query(
                "SELECT code, name, full_name FROM provinces ORDER BY code",
                (rs, i) ->
                        new ProvinceResource(
                                rs.getString("code"),
                                rs.getString("name"),
                                rs.getString("full_name")));
    }

    public List<WardRow> wards() {
        return jdbc.query(
                "SELECT code, province_code, name, full_name FROM wards ORDER BY code",
                (rs, i) ->
                        new WardRow(
                                rs.getString("code"),
                                rs.getString("province_code"),
                                rs.getString("name"),
                                rs.getString("full_name")));
    }

    /**
     * Streets of a province whose folded name contains every word. The SQL text depends only on how
     * many words there are, never on what they say: each word is a bound parameter (R-04). Names
     * that start with the first word come first, then shorter names.
     *
     * @param words already folded by TextNormalizer, at least one
     */
    public List<StreetResource> searchStreets(String provinceCode, List<String> words, int limit) {
        MapSqlParameterSource params =
                new MapSqlParameterSource()
                        .addValue("province", provinceCode)
                        .addValue("prefix", escapeLike(words.get(0)) + "%")
                        .addValue("limit", limit);
        StringBuilder where = new StringBuilder("s.province_code = :province");
        for (int i = 0; i < words.size(); i++) {
            where.append(" AND s.name_search LIKE :w").append(i).append(" ESCAPE '!'");
            params.addValue("w" + i, "%" + escapeLike(words.get(i)) + "%");
        }
        return jdbc.query(
                "SELECT s.name FROM streets s WHERE "
                        + where
                        + " ORDER BY (s.name_search LIKE :prefix ESCAPE '!') DESC,"
                        + " CHAR_LENGTH(s.name), s.name LIMIT :limit",
                params,
                (rs, i) -> new StreetResource(rs.getString("name")));
    }

    /** Folded words are [a-z0-9] only, but keep '%' and '_' literal anyway. */
    private static String escapeLike(String raw) {
        return raw.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }
}
