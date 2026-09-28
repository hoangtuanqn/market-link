package com.techx.intervue.modules.product.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.requests.DealSearchCriteria;
import com.techx.intervue.modules.product.resources.DealResource;
import com.techx.intervue.modules.product.services.interfaces.DealQueryServiceInterface;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import com.techx.intervue.resources.PageResource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-125 on real MySQL (spec §4.5.4, §9): GET /deals keeps only deal days customers can still order
 * for — a free slot before its cutoff, an approved stall, a listed product on sale, stock left,
 * inside the 14-day window — nearest day first, then the biggest discount. Rolled back after each
 * test. The shared dev database may hold seeded deals, so unfiltered results are narrowed to this
 * test's products.
 */
@SpringBootTest
@Transactional
class DealSearchIntegrationTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    private static final LocalDate D1 = TODAY.plusDays(2);
    private static final LocalDate D2 = TODAY.plusDays(3);
    private static final LocalDate FULL_DAY = TODAY.plusDays(5);
    private static final LocalDate FAR = TODAY.plusDays(20);

    @Autowired private DealQueryServiceInterface deals;
    @Autowired private JdbcTemplate jdbc;

    private final List<Long> mine = new ArrayList<>();
    private ReportFixture fx;
    private long otherMarket;
    private long category;
    private long otherCategory;
    private long stall;
    private long tomato;
    private long eggs;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        long market = fx.market("Deals market");
        otherMarket = fx.market("Deals other market");
        category = fx.category();
        otherCategory =
                insert(
                        "INSERT INTO categories (name, slug) VALUES (?, ?)",
                        "Deals other " + fx.tag,
                        "deals-other-" + fx.tag);
        stall = fx.farmer(fx.user("farmer", "Deal seller", "x"), "Deal stall", "approved");
        long suspended =
                fx.farmer(fx.user("farmer", "Held seller", "x"), "Held stall", "suspended");
        // A free 07:00 slot on every day from today+2 to today+13
        fx.sellsEveryDay(stall, market);
        fx.sellsEveryDay(suspended, market);
        // The stall is also at the other market, on D1's weekday only
        long link =
                insert(
                        "INSERT INTO farmer_markets (farmer_id, market_id) VALUES (?, ?)",
                        stall,
                        otherMarket);
        jdbc.update(
                "INSERT IGNORE INTO market_operating_days (market_id, day_of_week) VALUES (?, ?)",
                otherMarket,
                weekday(D1));
        jdbc.update(
                "INSERT INTO farmer_operating_days (farmer_market_id, day_of_week,"
                        + " pickup_start_time, pickup_end_time) VALUES (?, ?, '07:00', '10:00')",
                link,
                weekday(D1));
        // FULL_DAY's only slot has no room left
        jdbc.update(
                "UPDATE pickup_slots s JOIN farmer_markets fm ON fm.id = s.farmer_market_id"
                        + " SET s.booked_count = s.max_orders"
                        + " WHERE fm.farmer_id = ? AND s.slot_date = ?",
                stall,
                FULL_DAY);

        tomato = product(stall, category, "Tomato");
        eggs = product(stall, otherCategory, "Eggs");
        deal(tomato, D1, 12, 20);
        deal(tomato, FULL_DAY, 12, 30);
        deal(tomato, FAR, 12, 20);
        deal(eggs, D1, 8, 40);
        deal(eggs, D2, 5, 20);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 30, 2)",
                tomato,
                D2);

        long hidden = product(stall, category, "Hidden");
        jdbc.update("UPDATE products SET is_hidden = TRUE WHERE id = ?", hidden);
        deal(hidden, D1, 5, 50);
        long paused = product(stall, category, "Paused");
        jdbc.update("UPDATE products SET status = 'unavailable' WHERE id = ?", paused);
        deal(paused, D1, 5, 50);
        long deleted = product(stall, category, "Deleted");
        jdbc.update("UPDATE products SET is_deleted = TRUE WHERE id = ?", deleted);
        deal(deleted, D1, 5, 50);
        long soldOut = product(stall, category, "Gone");
        deal(soldOut, D1, 0, 50);
        long held = product(suspended, category, "Held");
        deal(held, D1, 5, 50);
    }

    /**
     * Full slot, outside the window, hidden, paused, deleted, sold out, suspended stall: left out.
     */
    @Test
    void keepsOnlyDealDaysCustomersCanStillOrderNearestDayFirstThenTheBiggestDiscount() {
        assertThat(found(criteria(null, null, null, null, 1, 50)))
                .containsExactly("Eggs@" + D1, "Tomato@" + D1, "Eggs@" + D2);
    }

    @Test
    void filtersByCategoryAndCountsOnlyWhatIsShown() {
        PageResource<DealResource> page =
                deals.search(criteria(null, otherCategory, null, null, 1, 50));

        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items()).extracting(DealResource::productId).containsOnly(eggs);
    }

    /** marketId keeps a day only when the stall is at that market on that weekday. */
    @Test
    void filtersByTheMarketTheStallIsAtThatDay() {
        PageResource<DealResource> page =
                deals.search(criteria(otherMarket, null, null, null, 1, 50));

        assertThat(page.items())
                .extracting(d -> d.name().split(" ")[0] + "@" + d.stockDate())
                .containsExactly("Eggs@" + D1, "Tomato@" + D1);
        assertThat(page.total()).isEqualTo(2);
    }

    @Test
    void filtersByProductAndWeekdayAndPages() {
        PageResource<DealResource> first = deals.search(criteria(null, null, null, eggs, 1, 1));
        assertThat(first.total()).isEqualTo(2);
        assertThat(first.items())
                .extracting(DealResource::stockDate)
                .containsExactly(D1.toString());

        assertThat(deals.search(criteria(null, null, null, eggs, 2, 1)).items())
                .extracting(DealResource::stockDate)
                .containsExactly(D2.toString());
        assertThat(deals.search(criteria(null, null, weekday(D2), eggs, 1, 50)).items())
                .extracting(DealResource::stockDate)
                .containsExactly(D2.toString());
    }

    @Test
    void describesEachDealForItsCard() {
        DealResource d = deals.search(criteria(null, null, null, tomato, 1, 50)).items().getFirst();

        assertThat(d.stockDate()).isEqualTo(D1.toString());
        assertThat(d.listPrice()).isEqualByComparingTo("2.00");
        assertThat(d.unitPrice()).isEqualByComparingTo("1.60");
        assertThat(d.discountPercent()).isEqualTo(20);
        assertThat(d.bestBefore()).isEqualTo(D1.plusDays(1).toString());
        assertThat(d.daysLeft()).isEqualTo(2);
        assertThat(d.quantityAvailable()).isEqualTo(12);
        assertThat(d.unit()).isEqualTo("kg");
        assertThat(d.farmerId()).isEqualTo(stall);
        assertThat(d.stallName()).isEqualTo("Deal stall " + fx.tag);
        assertThat(d.marketNames())
                .containsExactly("Deals market " + fx.tag, "Deals other market " + fx.tag);
        assertThat(d.storageMode()).isEqualTo("room");
        // On D2's weekday the stall is only at the first market
        assertThat(
                        deals.search(criteria(null, null, null, eggs, 2, 1))
                                .items()
                                .getFirst()
                                .marketNames())
                .containsExactly("Deals market " + fx.tag);
    }

    private List<String> found(DealSearchCriteria c) {
        return deals.search(c).items().stream()
                .filter(d -> mine.contains(d.productId()))
                .map(d -> d.name().split(" ")[0] + "@" + d.stockDate())
                .toList();
    }

    private static DealSearchCriteria criteria(
            Long marketId, Long categoryId, Integer day, Long productId, int page, int pageSize) {
        return new DealSearchCriteria(marketId, categoryId, day, productId, page, pageSize);
    }

    private static int weekday(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7;
    }

    /** $2.00 a kg, with an active template (the public catalogue needs one). */
    private long product(long farmerId, long categoryId, String name) {
        long id = fx.product(farmerId, categoryId, name, 2);
        fx.everyDayTemplate(farmerId, id, 20);
        mine.add(id);
        return id;
    }

    /** Packed three days before the day, good until the day after it. */
    private void deal(long productId, LocalDate day, int quantity, int percent) {
        BigDecimal list = new BigDecimal("2.00");
        BigDecimal price =
                list.multiply(BigDecimal.valueOf(100 - percent))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price, list_price, discount_percent, packed_on, best_before)"
                        + " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                productId,
                day,
                quantity,
                price,
                list,
                percent,
                day.minusDays(3),
                day.plusDays(1));
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
