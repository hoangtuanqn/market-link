package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * FR-120: "what other stalls set" counts only visible products of approved stalls, never the asking
 * stall's own products (spec §4.1).
 */
@SpringBootTest
class ShelfLifePeerQueryRepositoryTest {

    @Autowired private ShelfLifePeerQueryRepository peers;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private final Deque<String[]> created = new ArrayDeque<>();
    private long guideId;
    private long ownStall;

    @BeforeEach
    void setUp() {
        long category =
                track(
                        "categories",
                        insert(
                                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                                "Peer " + tag,
                                "peer-" + tag));
        guideId =
                track(
                        "shelf_life_guides",
                        insert(
                                "INSERT INTO shelf_life_guides (category_id, group_name,"
                                        + " storage_mode, suggested_days) VALUES (?, 'Leafy',"
                                        + " 'chilled', 3)",
                                category));
        ownStall = stall("approved");
        long other = stall("approved");
        long suspended = stall("suspended");
        product(ownStall, category, "own", 9, false, false);
        product(other, category, "a", 3, false, false);
        product(other, category, "b", 4, false, false);
        product(other, category, "hidden", 7, true, false);
        product(other, category, "deleted", 8, false, true);
        product(suspended, category, "suspended", 5, false, false);
    }

    @AfterEach
    void tearDown() {
        while (!created.isEmpty()) {
            String[] row = created.pop();
            jdbc.update("DELETE FROM " + row[0] + " WHERE id = ?", Long.valueOf(row[1]));
        }
    }

    @Test
    void countsOtherApprovedStallsVisibleProductsOnly() {
        Map<Long, List<Integer>> days = peers.daysByGuide(List.of(guideId), ownStall);

        assertThat(days.get(guideId)).containsExactlyInAnyOrder(3, 4);
    }

    @Test
    void countsEveryStallWhenNobodyIsExcluded() {
        Map<Long, List<Integer>> days = peers.daysByGuide(List.of(guideId), null);

        assertThat(days.get(guideId)).containsExactlyInAnyOrder(9, 3, 4);
    }

    @Test
    void answersNothingForNoGuides() {
        assertThat(peers.daysByGuide(List.of(), null)).isEmpty();
    }

    private long stall(String status) {
        String label = tag + "-" + UUID.randomUUID().toString().substring(0, 4);
        long user =
                track(
                        "users",
                        insert(
                                "INSERT INTO users (full_name, email, password_hash, role)"
                                        + " VALUES (?, ?, 'x', 'farmer')",
                                "Peer " + label,
                                "peer-" + label + "@test.vn"));
        return track(
                "farmer_profiles",
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, 'Owner', ?)",
                        user,
                        "Stall " + label,
                        status));
    }

    private void product(
            long farmer, long category, String name, int days, boolean hidden, boolean deleted) {
        track(
                "products",
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity, shelf_life_days, shelf_life_guide_id,"
                                + " storage_mode, is_hidden, is_deleted) VALUES (?, ?, ?, 1,"
                                + " 'kg', 5, ?, ?, 'chilled', ?, ?)",
                        farmer,
                        category,
                        name + " " + tag,
                        days,
                        guideId,
                        hidden,
                        deleted));
    }

    private long track(String table, long id) {
        created.push(new String[] {table, String.valueOf(id)});
        return id;
    }

    private long insert(String sql, Object... args) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(
                con -> {
                    PreparedStatement ps =
                            con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                    for (int i = 0; i < args.length; i++) {
                        ps.setObject(i + 1, args[i]);
                    }
                    return ps;
                },
                keys);
        return keys.getKey().longValue();
    }
}
