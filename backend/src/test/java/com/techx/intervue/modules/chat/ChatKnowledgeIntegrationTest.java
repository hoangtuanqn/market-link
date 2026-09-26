package com.techx.intervue.modules.chat;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
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

/**
 * FR-090…092. The chatbot was written before the catalogue tables existed; this is the first time
 * its SQL runs against the real schema (Task 11.1). Also the evidence for R-04: no statement
 * concatenates the question into SQL, so a quote in the question is just a character.
 *
 * <p>Rows carry a unique tag and are removed in {@code @AfterEach} (shared dev database).
 */
@SpringBootTest
class ChatKnowledgeIntegrationTest {

    @Autowired private ChatServiceInterface chat;
    @Autowired private JdbcTemplate jdbc;

    private final String tag =
            UUID.randomUUID().toString().substring(0, 8).replaceAll("[^a-z]", "x");
    private final String session = "chat-it-" + tag;
    private final Deque<String[]> created = new ArrayDeque<>();
    private String marketCore;
    private String stallName;

    @BeforeEach
    void setUp() {
        marketCore = "hoa" + tag;
        stallName = "Vuon " + tag;
        long category =
                track(
                        "categories",
                        insert(
                                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                                "Chat " + tag,
                                "chat-" + tag));
        long market =
                track(
                        "markets",
                        insert(
                                "INSERT INTO markets (market_name, address, latitude, longitude,"
                                        + " opening_time, closing_time) VALUES (?, 'Q1', 10.8,"
                                        + " 106.7, '06:00:00', '12:00:00')",
                                "Cho " + marketCore));
        track(
                "market_operating_days",
                insert(
                        "INSERT INTO market_operating_days (market_id, day_of_week) VALUES (?, 6)",
                        market));
        long farmerUser =
                track(
                        "users",
                        insert(
                                "INSERT INTO users (full_name, email, password_hash, role) VALUES"
                                        + " (?, ?, 'x', 'farmer')",
                                "Chat farmer " + tag,
                                "chat-farmer-" + tag + "@chat.test"));
        long farmer =
                track(
                        "farmer_profiles",
                        insert(
                                "INSERT INTO farmer_profiles (user_id, stall_name, contact_person,"
                                        + " approval_status) VALUES (?, ?, 'x', 'approved')",
                                farmerUser,
                                stallName));
        long farmerMarket =
                track(
                        "farmer_markets",
                        insert(
                                "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                                farmer,
                                market));
        track(
                "farmer_operating_days",
                insert(
                        "INSERT INTO farmer_operating_days (farmer_market_id, day_of_week,"
                                + " pickup_start_time, pickup_end_time) VALUES (?, 6, '07:00:00',"
                                + " '10:00:00')",
                        farmerMarket));
        track(
                "products",
                insert(
                        "INSERT INTO products (farmer_id, category_id, name, price, unit,"
                                + " stock_quantity) VALUES (?, ?, ?, 45000, 'kg', 12)",
                        farmer,
                        category,
                        "Buoi" + tag));
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM chat_messages WHERE session_key = ?", session);
        while (!created.isEmpty()) {
            String[] row = created.pop();
            jdbc.update("DELETE FROM " + row[0] + " WHERE id = ?", Long.valueOf(row[1]));
        }
    }

    @Test
    void findProductReturnsSeededRows() {
        ChatReplyResource reply = ask("find buoi" + tag);

        assertThat(reply.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
        assertThat(reply.results()).isNotEmpty();
        assertThat(reply.results().get(0).type()).isEqualTo("product");
        assertThat(reply.reply()).contains("Buoi" + tag).contains(stallName);
    }

    @Test
    void marketHoursAnswersFromTheMarketsTable() {
        ChatReplyResource reply = ask("cho " + marketCore + " may gio mo cua");

        assertThat(reply.intent()).isEqualTo(ChatIntent.MARKET_HOURS);
        assertThat(reply.reply()).contains("06:00–12:00").contains("Sat");
        assertThat(reply.results()).extracting("type").contains("market");
    }

    @Test
    void farmerAvailabilityUsesOperatingDays() {
        ChatReplyResource reply = ask("farmers at " + marketCore + " on saturday");

        assertThat(reply.intent()).isEqualTo(ChatIntent.FARMER_AVAILABILITY);
        assertThat(reply.reply()).contains(stallName).contains("Sat 07:00–10:00");
        assertThat(reply.results()).extracting("title").contains(stallName);
    }

    @Test
    void everyMessageIsStoredWithItsIntent() {
        ask("find buoi" + tag);

        List<Map<String, Object>> rows =
                jdbc.queryForList(
                        "SELECT role, intent FROM chat_messages WHERE session_key = ? ORDER BY id",
                        session);
        assertThat(rows).hasSize(2);
        assertThat(rows.get(0).get("role")).isEqualTo("user");
        assertThat(rows.get(0).get("intent")).isEqualTo("FIND_PRODUCT");
        assertThat(rows.get(1).get("role")).isEqualTo("bot");
    }

    @Test
    void aQuoteInTheQuestionDoesNotBreakTheQuery() {
        ChatReplyResource reply = ask("find rau' OR 1=1 --");

        assertThat(reply.reply()).doesNotContain("market data is not available");
        assertThat(reply.results()).isEmpty();
    }

    private ChatReplyResource ask(String message) {
        return chat.reply(new ChatRequest(session, message), null);
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
