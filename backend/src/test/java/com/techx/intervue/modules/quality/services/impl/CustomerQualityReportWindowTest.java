package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.requests.CreateQualityReportRequest;
import com.techx.intervue.modules.quality.services.interfaces.CustomerQualityReportServiceInterface;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CustomerQualityReportWindowTest {

    private static final LocalDate TODAY = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Autowired private CustomerQualityReportServiceInterface service;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long farmer;
    private long category;
    private long order;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        farmer = fx.base.farmer(fx.base.user("farmer", "Seller", "x"), "Stall", "approved");
        category = fx.base.category();
        order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        2,
                        TODAY.minusDays(5));
    }

    private long line(String name, LocalDate bestBefore) {
        return fx.line(order, fx.base.product(farmer, category, name, 1), bestBefore, true);
    }

    private static CreateQualityReportRequest on(LocalDate day) {
        return new CreateQualityReportRequest(day, QualityProblem.MOLD, null, null);
    }

    @Test
    void theLastDayOfTheWindowIsAcceptedAndTheNextIsNot() {
        long lastDay = line("Rau muống", TODAY.minusDays(2));
        long tooLate = line("Cải ngọt", TODAY.minusDays(3));

        assertThat(service.report(customer, order, lastDay, on(TODAY.minusDays(3))).status())
                .isEqualTo("open");
        assertThat(
                        jdbc.queryForObject(
                                "SELECT before_promise FROM quality_reports WHERE order_item_id = ?",
                                Boolean.class,
                                lastDay))
                .isTrue();
        assertThatThrownBy(() -> service.report(customer, order, tooLate, on(TODAY.minusDays(4))))
                .isInstanceOf(ReportWindowClosedException.class);
    }

    @Test
    void aLineIsReportedOnce() {
        long item = line("Rau dền", TODAY);
        service.report(customer, order, item, on(TODAY));

        assertThatThrownBy(() -> service.report(customer, order, item, on(TODAY)))
                .isInstanceOf(ItemAlreadyReportedException.class);
        assertThat(
                        jdbc.queryForObject(
                                "SELECT COUNT(*) FROM quality_reports WHERE order_item_id = ?",
                                Integer.class,
                                item))
                .isEqualTo(1);
    }

    @Test
    void anotherCustomerCannotReportTheOrder() {
        long item = line("Mồng tơi", TODAY);
        long stranger = fx.base.user("customer", "Stranger", "x");

        assertThatThrownBy(() -> service.report(stranger, order, item, on(TODAY)))
                .isInstanceOf(OrderNotYoursException.class);
    }
}
