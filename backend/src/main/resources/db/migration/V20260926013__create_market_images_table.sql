-- FR-073. Ảnh cho một chợ: 1 hoặc nhiều ảnh, quản lý ở Admin > Markets. `markets.image_url` (LEAD,
-- db/schema.sql) giữ nguyên vai trò ảnh đại diện — luôn được đồng bộ theo ảnh đầu tiên của danh sách
-- này. Bảng phụ này không có trong db/schema.sql — đề xuất LEAD (R-02), theo đúng tinh thần
-- market_operating_days / farmer_markets: quan hệ một-nhiều mà LEAD gợi ý gói vào một cột không đủ chỗ.
CREATE TABLE market_images (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_id  BIGINT UNSIGNED NOT NULL,
    image_url  VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_market_images_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    INDEX idx_market_images_market (market_id, sort_order)
);
