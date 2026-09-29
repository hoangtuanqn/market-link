package com.techx.intervue.modules.product.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.product.resources.ShelfLifeResource;
import com.techx.intervue.modules.report.services.impl.ReportFixture;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class ProductShelfLifeQueryTest {

    @Autowired private ProductQueryRepository query;
    @Autowired private JdbcTemplate jdbc;

    private ReportFixture fx;
    private long category;
    private long farmer;

    @BeforeEach
    void setUp() {
        fx = new ReportFixture(jdbc);
        category = fx.category();
        farmer =
                fx.farmer(fx.user("farmer", "Shelf " + fx.tag, "x"), "Stall " + fx.tag, "approved");
    }

    @AfterEach
    void tearDown() {
        jdbc.update(
                "UPDATE products SET shelf_life_guide_id = NULL WHERE category_id = ?", category);
        jdbc.update("DELETE FROM shelf_life_guides WHERE category_id = ?", category);
        fx.cleanUp();
    }

    @Test
    void readsTheGroupTheProductWasComparedWith() {
        jdbc.update(
                "INSERT INTO shelf_life_guides (category_id, group_name, storage_mode,"
                        + " suggested_days) VALUES (?, 'Leafy greens', 'chilled', 3)",
                category);
        long guide =
                jdbc.queryForObject(
                        "SELECT id FROM shelf_life_guides WHERE category_id = ?",
                        Long.class,
                        category);
        long product = fx.product(farmer, category, "Rau muống " + fx.tag, 1);
        jdbc.update(
                "UPDATE products SET shelf_life_days = 5, shelf_life_guide_id = ?, storage_mode ="
                        + " 'chilled', suggested_shelf_life_days = 3, shelf_life_extended = TRUE"
                        + " WHERE id = ?",
                guide,
                product);

        assertThat(query.shelfLife(product))
                .contains(new ShelfLifeResource(guide, "Leafy greens", "chilled", 5, 3, true));
    }

    @Test
    void readsAProductSavedBeforeGroupsExisted() {
        long product = fx.product(farmer, category, "Cải ngọt " + fx.tag, 1);

        ShelfLifeResource shelfLife = query.shelfLife(product).orElseThrow();

        assertThat(shelfLife.guideId()).isNull();
        assertThat(shelfLife.groupName()).isNull();
        assertThat(shelfLife.storageMode()).isEqualTo("room");
        assertThat(shelfLife.suggestedDays()).isNull();
        assertThat(shelfLife.extended()).isFalse();
    }
}
