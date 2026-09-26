-- FR-063. Cột theo db/schema.sql §4; khoá theo quy ước thật (BIGINT UNSIGNED, PK `id`)
-- — cùng lý do đã ghi ở V20260925007 và V20260926008.
CREATE TABLE weekly_stock_templates (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id        BIGINT UNSIGNED NOT NULL,
    product_id       BIGINT UNSIGNED NOT NULL,
    day_of_week      TINYINT NOT NULL,
    default_quantity INT NOT NULL,
    -- NULL = áp dụng thì giữ nguyên giá hiện tại của product, không ghi đè.
    default_price    DECIMAL(10, 2) NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_weekly_stock_templates_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_weekly_stock_templates_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    UNIQUE KEY uq_weekly_stock_template (product_id, day_of_week),
    CONSTRAINT ck_weekly_stock_templates_day CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT ck_weekly_stock_templates_quantity CHECK (default_quantity >= 0),
    CONSTRAINT ck_weekly_stock_templates_price CHECK (default_price IS NULL OR default_price >= 0)
);
