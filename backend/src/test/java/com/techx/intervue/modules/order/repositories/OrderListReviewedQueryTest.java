package com.techx.intervue.modules.order.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.resources.OrderListItemResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import java.time.LocalDate;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class OrderListReviewedQueryTest {

    @Autowired private OrderQueryRepository orders;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
    }

    @AfterEach
    void tearDown() {
        fx.cleanUp();
    }

    @Test
    void eachRowSaysWhetherTheOrderWasReviewed() {
        long customer = fx.user("customer", "Buyer " + fx.tag, "x");
        long farmer =
                fx.farmer(
                        fx.user("farmer", "Seller " + fx.tag, "x"), "Stall " + fx.tag, "approved");
        long market = fx.market("Market " + fx.tag);
        long reviewed =
                fx.order(customer, farmer, market, "completed", 2, LocalDate.of(2026, 9, 20));
        long notYet = fx.order(customer, farmer, market, "completed", 2, LocalDate.of(2026, 9, 21));
        jdbc.update(
                "INSERT INTO reviews (customer_id, order_id, target_type, farmer_id, rating)"
                        + " VALUES (?, ?, 'farmer', ?, 5)",
                customer,
                reviewed,
                farmer);

        Map<Long, Boolean> flags =
                orders.myOrders(customer, null, 0, 10).items().stream()
                        .collect(
                                Collectors.toMap(
                                        OrderListItemResource::orderId,
                                        OrderListItemResource::reviewed));

        assertThat(flags).containsEntry(reviewed, true).containsEntry(notYet, false);
        assertThat(orders.findDetail(reviewed).orElseThrow().summary().reviewed()).isTrue();
    }
}
