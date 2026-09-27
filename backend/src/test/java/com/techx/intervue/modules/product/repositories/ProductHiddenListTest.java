package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.FarmerProductResource;
import com.techx.intervue.resources.PageResource;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
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
 * FR-074: the Admin's hidden-listings queue. Without it a hidden listing can never be found again
 * to unhide it (QA E2E round 3, bug 2). Runs against real MySQL because the query is native SQL.
 */
@SpringBootTest
class ProductHiddenListTest {

    @Autowired private ProductQueryRepository query;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;
    private Long farmerUserId;
    private Long farmerId;
    private Long hiddenId;
    private Long visibleId;
    private Long hiddenDeletedId;

    @BeforeEach
    void setUp() {
        categoryId =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Hidden test " + tag,
                        "hidden-" + tag);
        farmerUserId =
                insert(
                        "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?,"
                                + " 'x', 'farmer')",
                        "Hidden farmer " + tag,
                        "hidden-" + tag + "@test.vn");
        farmerId =
                insert(
                        "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                + " approval_status) VALUES (?, ?, ?, 'approved')",
                        farmerUserId,
                        "Stall hidden " + tag,
                        "Owner " + tag);
        hiddenId = product("Hidden " + tag, true, false, "Misleading photo");
        visibleId = product("Visible " + tag, false, false, null);
        hiddenDeletedId = product("Hidden deleted " + tag, true, true, "Spam");
    }

    @AfterEach
    void tearDown() {
        for (Long id : List.of(hiddenId, visibleId, hiddenDeletedId)) {
            jdbc.update("DELETE FROM products WHERE id = ?", id);
        }
        jdbc.update("DELETE FROM farmer_profiles WHERE id = ?", farmerId);
        jdbc.update("DELETE FROM users WHERE id = ?", farmerUserId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    @Test
    void listsHiddenListingsWithTheirReasonAndSkipsVisibleAndDeletedOnes() {
        PageResource<FarmerProductResource> page = query.hidden(0, 200);

        List<FarmerProductResource> mine =
                page.items().stream().filter(p -> p.item().name().endsWith(tag)).toList();
        assertThat(mine).hasSize(1);
        FarmerProductResource hidden = mine.get(0);
        assertThat(hidden.item().id()).isEqualTo(hiddenId);
        assertThat(hidden.hidden()).isTrue();
        assertThat(hidden.hiddenReason()).isEqualTo("Misleading photo");
        assertThat(hidden.item().stallName()).isEqualTo("Stall hidden " + tag);
        assertThat(page.total()).isGreaterThanOrEqualTo(1);
    }

    private long product(String name, boolean hidden, boolean deleted, String reason) {
        return insert(
                "INSERT INTO products (farmer_id, category_id, name, price, unit, stock_quantity,"
                        + " is_hidden, is_deleted, hidden_reason) VALUES (?, ?, ?, 10, 'kg', 5, ?,"
                        + " ?, ?)",
                farmerId,
                categoryId,
                name,
                hidden,
                deleted,
                reason);
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
