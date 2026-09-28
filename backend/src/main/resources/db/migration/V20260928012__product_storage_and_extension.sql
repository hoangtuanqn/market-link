-- FR-121 (proposed): how a product is kept, the suggestion its shelf life was compared with when it
-- was saved, and whether the Farmer set it longer (and when they confirmed that promise). Existing
-- products become "room temperature, no suggestion recorded, not extended": nothing is judged
-- retroactively.
ALTER TABLE products
    ADD COLUMN shelf_life_guide_id BIGINT UNSIGNED NULL AFTER shelf_life_days,
    ADD COLUMN storage_mode ENUM('room', 'chilled') NOT NULL DEFAULT 'room' AFTER shelf_life_guide_id,
    ADD COLUMN suggested_shelf_life_days INT NULL AFTER storage_mode,
    ADD COLUMN shelf_life_extended BOOLEAN NOT NULL DEFAULT FALSE AFTER suggested_shelf_life_days,
    ADD COLUMN shelf_life_ack_at DATETIME NULL AFTER shelf_life_extended,
    ADD CONSTRAINT fk_products_shelf_life_guide
        FOREIGN KEY (shelf_life_guide_id) REFERENCES shelf_life_guides (id);
