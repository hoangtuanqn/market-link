package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.FarmerDealResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FarmerDealsQueryTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private DealQueryRepository deals;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
    }

    @Test
    void listsOnlyThisStallsDealDaysFromTodayByDayThenName() {
        long category = fx.category();
        long stall = fx.farmer(fx.user("farmer", "Deal seller", "x"), "Deal stall", "approved");
        long other = fx.farmer(fx.user("farmer", "Other seller", "x"), "Other stall", "approved");
        long tomato = fx.product(stall, category, "Tomato", 2);
        long eggs = fx.product(stall, category, "Eggs", 3);
        long gone = fx.product(stall, category, "Gone", 1);
        long theirs = fx.product(other, category, "Theirs", 1);
        jdbc.update("UPDATE products SET is_deleted = TRUE WHERE id = ?", gone);
        deal(eggs, TODAY.plusDays(3), 40);
        deal(tomato, TODAY.plusDays(3), 20);
        deal(tomato, TODAY.plusDays(2), 20);
        deal(tomato, TODAY.minusDays(1), 20);
        deal(gone, TODAY.plusDays(2), 20);
        deal(theirs, TODAY.plusDays(2), 20);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price) VALUES (?, ?, 30, 3)",
                eggs,
                TODAY.plusDays(2));

        List<FarmerDealResource> rows = deals.farmerDeals(stall, TODAY);

        assertThat(rows)
                .extracting(r -> r.productName().split(" ")[0] + "@" + r.stockDate())
                .containsExactly(
                        "Tomato@" + TODAY.plusDays(2),
                        "Eggs@" + TODAY.plusDays(3),
                        "Tomato@" + TODAY.plusDays(3));
        FarmerDealResource first = rows.getFirst();
        assertThat(first.unit()).isEqualTo("kg");
        assertThat(first.listPrice()).isEqualByComparingTo("2.00");
        assertThat(first.unitPrice()).isEqualByComparingTo("1.60");
        assertThat(first.discountPercent()).isEqualTo(20);
        assertThat(first.quantityAvailable()).isEqualTo(5);
        assertThat(first.packedOn()).isEqualTo(TODAY.minusDays(3).toString());
        assertThat(first.bestBefore()).isEqualTo(TODAY.plusDays(3).toString());
        assertThat(first.daysLeft()).isEqualTo(2);
    }

    private void deal(long productId, LocalDate day, int percent) {
        BigDecimal list =
                jdbc.queryForObject(
                        "SELECT price FROM products WHERE id = ?", BigDecimal.class, productId);
        BigDecimal price =
                list.multiply(BigDecimal.valueOf(100 - percent))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        jdbc.update(
                "INSERT INTO product_daily_stock (product_id, stock_date, quantity_available,"
                        + " unit_price, list_price, discount_percent, packed_on, best_before)"
                        + " VALUES (?, ?, 5, ?, ?, ?, ?, ?)",
                productId,
                day,
                price,
                list,
                percent,
                TODAY.minusDays(3),
                day.plusDays(1));
    }
}
