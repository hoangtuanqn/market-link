package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.product.requests.ProductRequest;
import com.techx.intervue.modules.product.services.interfaces.ProductServiceInterface;
import com.techx.intervue.modules.quality.QualityFixture;
import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** FR-123 (spec §4.2, §4.4.4, §9): the lock as the product form meets it, on real MySQL. */
@SpringBootTest
@Transactional
class ExtensionLockProductTest {

    @Autowired private ProductServiceInterface productService;
    @Autowired private JdbcTemplate jdbc;

    private QualityFixture fx;
    private long farmerUser;
    private long farmer;
    private long category;
    private long guide;
    private long product;

    @BeforeEach
    void setUp() {
        fx = new QualityFixture(jdbc);
        long customer = fx.base.user("customer", "Buyer", "x");
        long admin = fx.base.user("admin", "Admin", "x");
        farmerUser = fx.base.user("farmer", "Seller", "x");
        farmer = fx.base.farmer(farmerUser, "Stall", "approved");
        category = fx.base.category();
        guide = fx.guide(category, 3);
        product = fx.base.product(farmer, category, "Rau muống", 1);
        fx.shelfLife(product, guide, 3, 3);
        long order =
                fx.base.order(
                        customer,
                        farmer,
                        fx.base.market("Market"),
                        "completed",
                        3,
                        LocalDate.of(2026, 10, 3));
        for (String name : List.of("Cải ngọt", "Mồng tơi", "Rau dền")) {
            long line =
                    fx.line(
                            order,
                            fx.base.product(farmer, category, name, 1),
                            LocalDate.of(2026, 10, 7),
                            true);
            fx.strike(fx.report(line, "confirmed", true, 10), admin, 5);
        }
    }

    /** The name the fixture gave the product ("Rau muống <tag>"), so the update keeps it. */
    private ProductRequest withDays(int days) {
        return new ProductRequest(
                category,
                "Rau muống " + fx.base.tag,
                null,
                BigDecimal.ONE,
                "bunch",
                10,
                null,
                days,
                guide,
                "chilled",
                days > 3);
    }

    @Test
    void aLockedStallCannotGoLongerThanSuggested() {
        assertThatThrownBy(() -> productService.update(farmerUser, product, withDays(5)))
                .isInstanceOf(ShelfLifeExtensionLockedException.class);
    }

    @Test
    void aLockedStallStillSavesAtTheSuggestion() {
        assertThat(productService.update(farmerUser, product, withDays(3)).shelfLife().days())
                .isEqualTo(3);
    }

    @Test
    void twoStrikesDoNotLock() {
        jdbc.update(
                "DELETE FROM farmer_violations WHERE farmer_id = ? ORDER BY id LIMIT 1", farmer);

        assertThat(productService.update(farmerUser, product, withDays(5)).shelfLife().extended())
                .isTrue();
    }
}
