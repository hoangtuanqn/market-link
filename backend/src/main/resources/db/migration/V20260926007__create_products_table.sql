-- FR-062, FR-020…023, FR-074. Cột theo db/schema.sql §4; khoá theo quy ước thật (BIGINT UNSIGNED, PK `id`)
-- — cùng lý do đã ghi ở V20260925007 và V20260926004.
CREATE TABLE products (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id      BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NOT NULL,
    name           VARCHAR(150) NOT NULL,
    description    TEXT NULL,
    price          DECIMAL(10, 2) NOT NULL,
    unit           VARCHAR(20) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    image_url      VARCHAR(255) NULL,
    status         ENUM('available', 'sold_out', 'unavailable') NOT NULL DEFAULT 'available',
    -- Xoá mềm: order_items trỏ tới product_id, đơn cũ phải đọc lại được (FR-036).
    is_deleted     BOOLEAN NOT NULL DEFAULT FALSE,
    -- Admin ẩn listing vi phạm (FR-074). Khác is_deleted và khác status: Farmer không tự gỡ được cờ này.
    -- Không có trong db/schema.sql — đề xuất LEAD (plan §R.5 #2).
    is_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason  VARCHAR(255) NULL,
    rating_avg     DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    rating_count   INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
    -- Khoá tự nhiên cho db/seed.sql chạy lại được (FR-100); một stall không đăng hai sản phẩm cùng tên.
    UNIQUE KEY uq_product_per_farmer (farmer_id, name),
    INDEX idx_products_farmer (farmer_id, status),
    INDEX idx_products_category (category_id, status),
    INDEX idx_products_visible (is_deleted, is_hidden, status),
    CONSTRAINT ck_products_price CHECK (price >= 0),
    CONSTRAINT ck_products_stock CHECK (stock_quantity >= 0)
);
