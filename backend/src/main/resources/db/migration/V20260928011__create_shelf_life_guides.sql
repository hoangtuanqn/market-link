-- FR-120 (proposed, not yet in .ai/REQUIREMENTS.md): shelf-life guides. One row is a group of
-- products inside a category kept one way (room temperature or the fridge), with the number of
-- days the app suggests to the Farmer. The default rows are seed data (db/seed.sql), because the
-- categories they point to are seed data too.
CREATE TABLE shelf_life_guides (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id    BIGINT UNSIGNED NOT NULL,
    group_name     VARCHAR(80) NOT NULL,
    examples       VARCHAR(255) NOT NULL DEFAULT '',
    storage_mode   ENUM('room', 'chilled') NOT NULL,
    suggested_days INT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_shelf_life_guides_category FOREIGN KEY (category_id) REFERENCES categories (id),
    CONSTRAINT uq_shelf_life_guide UNIQUE (category_id, group_name, storage_mode),
    CONSTRAINT ck_shelf_life_guides_days CHECK (suggested_days >= 1)
);
