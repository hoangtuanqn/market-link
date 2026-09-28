package com.techx.intervue.modules.quality.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.resources.PageResource;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-122, FR-123: the reports as the stall and the admin read them, against real MySQL. */
@SpringBootTest
@Transactional
class QualityReportQueryRepositoryTest {

    private static final LocalDate PICKUP = LocalDate.of(2026, 10, 3);

    @Autowired private QualityReportQueryRepository queries;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long customer;
    private long admin;
    private long stallA;
    private long stallB;
    private long category;
    private long market;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        customer = fx.base.user("customer", "Buyer", "x");
        admin = fx.base.user("admin", "Admin", "x");
        stallA = fx.base.farmer(fx.base.user("farmer", "Seller A", "x"), "Stall A", "approved");
        stallB = fx.base.farmer(fx.base.user("farmer", "Seller B", "x"), "Stall B", "approved");
        category = fx.base.category();
        market = fx.base.market("Market");
    }

    private long reportAt(
            long stall, String product, String status, boolean extended, int minutesAgo) {
        long order = fx.base.order(customer, stall, market, "completed", 1, PICKUP);
        long item =
                fx.line(
                        order,
                        fx.base.product(stall, category, product, 1),
                        PICKUP.plusDays(4),
                        extended);
        return fx.report(item, status, true, minutesAgo);
    }

    private static Instant since() {
        return Instant.now().minus(Duration.ofDays(90));
    }

    @Test
    void aStallSeesOnlyItsOwnReportsNewestFirst() {
        long older = reportAt(stallA, "Rau muống", "open", true, 30);
        long newer = reportAt(stallA, "Cải ngọt", "confirmed", false, 5);
        reportAt(stallB, "Xoài", "open", true, 1);

        PageResource<QualityReportResource> page = queries.forStall(stallA, since(), 0, 20);

        assertThat(page.total()).isEqualTo(2);
        assertThat(page.items())
                .extracting(QualityReportResource::id)
                .containsExactly(newer, older);
        QualityReportResource row = page.items().get(1);
        assertThat(row.stallName()).startsWith("Stall A");
        assertThat(row.stallStatus()).isEqualTo("approved");
        assertThat(row.customerName()).startsWith("Buyer");
        assertThat(row.pickupDate()).isEqualTo("2026-10-03");
        assertThat(row.bestBefore()).isEqualTo("2026-10-07");
        assertThat(row.storageMode()).isEqualTo("chilled");
        assertThat(row.shelfLifeExtended()).isTrue();
        assertThat(row.extendedByDays()).isEqualTo(2);
        assertThat(row.status()).isEqualTo("open");
        assertThat(row.problem()).isEqualTo("mold");
    }

    /** Spec §4.4.3: the card shows the stall's strikes inside the 90-day window only. */
    @Test
    void eachRowCountsTheStallsStrikesInsideTheWindow() {
        long report = reportAt(stallA, "Rau muống", "confirmed", true, 10);
        fx.strike(report, admin, 1);
        fx.strike(reportAt(stallA, "Cải ngọt", "confirmed", true, 20), admin, 91);

        assertThat(queries.findById(report, since()))
                .map(QualityReportResource::stallActiveStrikes)
                .contains(1);
    }

    /** Ruling 6: "Needs a decision", "All open" and "Decided". */
    @Test
    void theAdminQueueFiltersNeedsADecisionAllOpenAndDecided() {
        long needs = reportAt(stallA, "Rau muống", "open", true, 3);
        long open = reportAt(stallA, "Cải ngọt", "open", false, 2);
        long decided = reportAt(stallB, "Xoài", "dismissed", true, 1);

        assertThat(queries.forAdmin("open", false, true, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(needs)
                .doesNotContain(open, decided);
        assertThat(queries.forAdmin("open", false, null, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(needs, open)
                .doesNotContain(decided);
        assertThat(queries.forAdmin(null, true, null, since(), 0, 200).items())
                .extracting(QualityReportResource::id)
                .contains(decided)
                .doesNotContain(needs, open);
    }
}
