package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.techx.intervue.modules.catalog.entities.ShelfLifeGuide;
import com.techx.intervue.modules.catalog.enums.StorageMode;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/** FR-120: the shelf-life guide table and its two finders, against real MySQL. */
@SpringBootTest
class ShelfLifeGuideRepositoryTest {

    @Autowired private ShelfLifeGuideRepository guides;
    @Autowired private JdbcTemplate jdbc;

    private final String tag = UUID.randomUUID().toString().substring(0, 8);
    private Long categoryId;

    @BeforeEach
    void setUp() {
        jdbc.update(
                "INSERT INTO categories (name, slug) VALUES (?, ?)",
                "Guide test " + tag,
                "guide-" + tag);
        categoryId =
                jdbc.queryForObject(
                        "SELECT id FROM categories WHERE slug = ?", Long.class, "guide-" + tag);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM shelf_life_guides WHERE category_id = ?", categoryId);
        jdbc.update("DELETE FROM categories WHERE id = ?", categoryId);
    }

    /** MySQL sorts an ENUM by declaration order, so room comes before chilled. */
    @Test
    void listsTheActiveGuidesOfOneCategoryByGroupThenMode() {
        save("Roots and bulbs", StorageMode.CHILLED, 21, true);
        save("Leafy greens", StorageMode.CHILLED, 3, true);
        save("Leafy greens", StorageMode.ROOM, 1, true);
        save("Old group", StorageMode.ROOM, 2, false);

        List<ShelfLifeGuide> active =
                guides.findByCategoryIdAndActiveTrueOrderByGroupNameAscStorageModeAsc(categoryId);

        assertThat(active)
                .extracting(ShelfLifeGuide::getGroupName, ShelfLifeGuide::getStorageMode)
                .containsExactly(
                        tuple("Leafy greens", StorageMode.ROOM),
                        tuple("Leafy greens", StorageMode.CHILLED),
                        tuple("Roots and bulbs", StorageMode.CHILLED));
        assertThat(guides.findByCategoryIdOrderByGroupNameAscStorageModeAsc(categoryId)).hasSize(4);
    }

    @Test
    void refusesTheSameGroupAndModeTwiceInOneCategory() {
        save("Leafy greens", StorageMode.CHILLED, 3, true);

        assertThatThrownBy(() -> save("Leafy greens", StorageMode.CHILLED, 4, true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private ShelfLifeGuide save(String group, StorageMode mode, int days, boolean active) {
        ShelfLifeGuide guide = new ShelfLifeGuide();
        guide.setCategoryId(categoryId);
        guide.setGroupName(group);
        guide.setExamples("rau muống, lettuce");
        guide.setStorageMode(mode);
        guide.setSuggestedDays(days);
        guide.setActive(active);
        return guides.saveAndFlush(guide);
    }
}
