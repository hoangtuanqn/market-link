package com.techx.intervue.modules.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.techx.intervue.modules.chat.repositories.AdminKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.FarmerKnowledgeRepository;
import com.techx.intervue.modules.chat.resources.FarmerRows.OrderRow;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@SpringBootTest
class AssistantKnowledgeIntegrationTest {

    @Autowired private FarmerKnowledgeRepository farmerKnowledge;
    @Autowired private AdminKnowledgeRepository adminKnowledge;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private NamedParameterJdbcTemplate named;

    private final String tag =
            UUID.randomUUID().toString().substring(0, 8).replaceAll("[^a-z0-9]", "x");
    private final Deque<String[]> created = new ArrayDeque<>();
    private long farmerUser;
    private long farmer;
    private long market;
    private long customer;
    private String orderCode;
    private long orderId;

    @BeforeEach
    void setUp() {
        customer =
                track(
                        "users",
                        insert(
                                "INSERT INTO users (full_name, email, password_hash, role) VALUES"
                                        + " (?, ?, 'x', 'customer')",
                                "Khach " + tag,
                                "it-customer-" + tag + "@chat.test"));
        farmerUser =
                track(
                        "users",
                        insert(
                                "INSERT INTO users (full_name, email, password_hash, role) VALUES"
                                        + " (?, ?, 'x', 'farmer')",
                                "Farmer " + tag,
                                "it-farmer-" + tag + "@chat.test"));
        farmer =
                track(
                        "farmer_profiles",
                        insert(
                                "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                        + " approval_status) VALUES (?, ?, 'x', 'approved')",
                                farmerUser,
                                "Vuon " + tag));
        market =
                track(
                        "markets",
                        insert(
                                "INSERT INTO markets (market_name, address, latitude, longitude,"
                                        + " opening_time, closing_time) VALUES (?, 'Q1', 10.8,"
                                        + " 106.7, '06:00:00', '12:00:00')",
                                "Cho " + tag));
        orderCode = "IT-" + tag;
        orderId =
                track(
                        "orders",
                        insert(
                                "INSERT INTO orders (order_code, customer_id, farmer_id, market_id,"
                                        + " pickup_date, pickup_start, pickup_end, cutoff_at, total_amount,"
                                        + " status) VALUES (?, ?, ?, ?, '2026-01-10', '07:00:00',"
                                        + " '08:00:00', '2026-01-09 19:00:00', 2.70, 'placed')",
                                orderCode,
                                customer,
                                farmer,
                                market));
    }

    @Test
    void oneOrderListsWhatIsInItForItsOwnStallOnly() {
        long category =
                track(
                        "categories",
                        insert(
                                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                                "It " + tag,
                                "it-" + tag));
        long product =
                track(
                        "products",
                        insert(
                                "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                        + " stock_quantity) VALUES (?, ?, ?, 0.50, 'bunch', 10)",
                                farmer,
                                category,
                                "Rau " + tag));
        track(
                "order_items",
                insert(
                        "INSERT INTO order_items (order_id, product_id, product_name, unit_price,"
                                + " unit, quantity, subtotal) VALUES (?, ?, ?, 0.50, 'bunch', 2,"
                                + " 1.00)",
                        orderId,
                        product,
                        "Rau " + tag));

        assertThat(farmerKnowledge.myOrderItems(farmer, orderId))
                .extracting(r -> r.productName(), r -> r.quantity())
                .containsExactly(org.assertj.core.groups.Tuple.tuple("Rau " + tag, 2));
        assertThat(farmerKnowledge.myOrderItems(farmer + 1_000_000, orderId)).isEmpty();
    }

    @AfterEach
    void tearDown() {
        while (!created.isEmpty()) {
            String[] row = created.pop();
            jdbc.update("DELETE FROM " + row[0] + " WHERE id = ?", Long.valueOf(row[1]));
        }
    }

    @Test
    void theOrderListNamesTheCustomer() {
        assertThat(farmerKnowledge.myOrders(farmer, null, null))
                .extracting(OrderRow::orderCode, OrderRow::customerName)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(orderCode, "Khach " + tag));
        assertThat(farmerKnowledge.myOrders(farmer, "placed", LocalDate.of(2026, 1, 10)))
                .extracting(OrderRow::orderCode)
                .containsExactly(orderCode);
    }

    @Test
    void theOrdersCloseToTheirCutoffNameTheCustomer() {
        assertThat(farmerKnowledge.cutoffSoon(farmer, 24))
                .extracting(OrderRow::customerName)
                .containsExactly("Khach " + tag);
    }

    private static final Clock EIGHT_AM_IN_VIETNAM =
            Clock.fixed(Instant.parse("2026-10-02T01:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Test
    void theMorningBannerCountsACutoffThatHasPassedInVietnam() {
        order("IB-" + tag, "2026-10-02", "2026-10-02 02:00:00");

        assertThat(
                        new FarmerKnowledgeRepository(named, EIGHT_AM_IN_VIETNAM)
                                .briefing(farmer, LocalDate.of(2026, 10, 2), 5)
                                .cutoffAlreadyPassed())
                .isEqualTo(1);
    }

    @Test
    void closeToCutoffLooksAheadFromVietnamTime() {
        String tonight = "IT-" + tag + "a";
        String tomorrowNight = "IT-" + tag + "b";
        order(tonight, "2026-10-03", "2026-10-02 20:00:00");
        order(tomorrowNight, "2026-10-04", "2026-10-03 20:00:00");

        assertThat(new FarmerKnowledgeRepository(named, EIGHT_AM_IN_VIETNAM).cutoffSoon(farmer, 24))
                .extracting(OrderRow::orderCode)
                .contains(tonight)
                .doesNotContain(tomorrowNight);
    }

    private void order(String code, String pickupDate, String cutoffAt) {
        track(
                "orders",
                insert(
                        "INSERT INTO orders (order_code, customer_id, farmer_id, market_id,"
                                + " pickup_date, pickup_start, pickup_end, cutoff_at, total_amount,"
                                + " status) VALUES (?, ?, ?, ?, ?, '07:00:00', '08:00:00', ?, 1.00,"
                                + " 'placed')",
                        code,
                        customer,
                        farmer,
                        market,
                        pickupDate,
                        cutoffAt));
    }

    @Test
    void everyOtherFarmerQueryRunsAgainstTheRealSchema() {
        assertThat(farmerKnowledge.farmerIdOf(farmerUser)).contains(farmer);
        assertThat(farmerKnowledge.stallName(farmer)).contains("Vuon " + tag);
        assertThat(farmerKnowledge.myOrderByCode(farmer, orderCode)).isPresent();
        assertThatCode(
                        () -> {
                            farmerKnowledge.myProducts(farmer, null, false, 5);
                            farmerKnowledge.myProducts(farmer, "sold_out", true, 5);
                            LocalDate from = LocalDate.of(2026, 1, 1);
                            LocalDate to = LocalDate.of(2026, 12, 31);
                            farmerKnowledge.mySales(farmer, from, to);
                            farmerKnowledge.bestSellers(farmer, from, to);
                            farmerKnowledge.myReviews(farmer, true);
                            farmerKnowledge.mySchedule(farmer);
                            farmerKnowledge.briefing(farmer, LocalDate.of(2026, 1, 10), 5);
                        })
                .doesNotThrowAnyException();
    }

    @Test
    void everyAdminQueryRunsAgainstTheRealSchema() {
        assertThat(adminKnowledge.application(farmer))
                .hasValueSatisfying(a -> assertThat(a.stallName()).isEqualTo("Vuon " + tag));
        assertThatCode(
                        () -> {
                            LocalDate from = LocalDate.of(2026, 1, 1);
                            LocalDate to = LocalDate.of(2026, 12, 31);
                            adminKnowledge.platformTotals(from, to);
                            adminKnowledge.marketActivity(from, to);
                            adminKnowledge.farmerApplications(null);
                            adminKnowledge.farmerApplications("pending");
                            adminKnowledge.searchUsers("customer", "active", tag);
                            adminKnowledge.flaggedReviews(2);
                            adminKnowledge.hiddenItems();
                            adminKnowledge.feedbackInbox("new", "bug", 5);
                            adminKnowledge.feedbackCounts();
                        })
                .doesNotThrowAnyException();
    }

    private long track(String table, long id) {
        created.push(new String[] {table, String.valueOf(id)});
        return id;
    }

    private long insert(String sql, Object... args) {
        var keys = new org.springframework.jdbc.support.GeneratedKeyHolder();
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
