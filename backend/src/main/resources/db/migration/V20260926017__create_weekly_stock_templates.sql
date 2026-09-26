-- FR-063: how much of each product a stall usually brings on each weekday; "apply" copies one
-- weekday onto products.stock_quantity. Keys are BIGINT UNSIGNED with primary key `id`, like the
-- real migrations (plan §S.4.1), not INT as db/schema.sql §4 writes.
CREATE TABLE weekly_stock_templates (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id        BIGINT UNSIGNED NOT NULL,
    product_id       BIGINT UNSIGNED NOT NULL,
    day_of_week      TINYINT NOT NULL,
    default_quantity INT NOT NULL,
    -- NULL keeps the product's current price when the template is applied
    default_price    DECIMAL(10, 2) NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_template_farmer FOREIGN KEY (farmer_id)
        REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_template_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE KEY uq_template (product_id, day_of_week),
    INDEX idx_template_farmer_day (farmer_id, day_of_week),
    CONSTRAINT ck_template_day CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT ck_template_quantity CHECK (default_quantity >= 0),
    CONSTRAINT ck_template_price CHECK (default_price IS NULL OR default_price >= 0)
);
