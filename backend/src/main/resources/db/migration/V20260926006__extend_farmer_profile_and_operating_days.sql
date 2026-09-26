-- FR-060, FR-061. Các cột này có trong db/schema.sql §2 nhưng V20260925007 chỉ lấy phần cần cho
-- bước duyệt Farmer; giờ mới tới lượt hồ sơ gian hàng. Khoá BIGINT UNSIGNED, PK `id` — cùng lý do
-- đã ghi ở V20260925007 và V20260926004.
ALTER TABLE farmer_profiles
    ADD COLUMN logo_url           VARCHAR(255) NULL AFTER description,
    ADD COLUMN order_cutoff_hours INT NOT NULL DEFAULT 12 AFTER logo_url,
    ADD COLUMN rating_avg         DECIMAL(3, 2) NOT NULL DEFAULT 0.00 AFTER order_cutoff_hours,
    ADD COLUMN rating_count       INT NOT NULL DEFAULT 0 AFTER rating_avg;

-- Khung giờ nhận hàng của Farmer tại từng chợ, theo từng thứ trong tuần (db/schema.sql §3).
CREATE TABLE farmer_operating_days (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_market_id  BIGINT UNSIGNED NOT NULL,
    day_of_week       TINYINT NOT NULL,
    pickup_start_time TIME NOT NULL,
    pickup_end_time   TIME NOT NULL,
    CONSTRAINT fk_fod_farmer_market FOREIGN KEY (farmer_market_id)
        REFERENCES farmer_markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_fm_day (farmer_market_id, day_of_week),
    CONSTRAINT ck_fod_day CHECK (day_of_week BETWEEN 0 AND 6)
);
