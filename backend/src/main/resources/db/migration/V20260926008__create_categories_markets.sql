-- FR-076, FR-073, FR-010, FR-012. Cột đặt tên theo db/schema.sql §3 và §4 (LEAD, R-02).
-- Khoá chính đặt tên `id` và kiểu BIGINT UNSIGNED để khớp users.id / farmer_profiles.id thật,
-- không theo `market_id INT` của schema.sql — cùng lý do đã ghi ở V20260925007.

CREATE TABLE categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    slug        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    icon        VARCHAR(50) NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_active_sort (is_active, sort_order)
);

CREATE TABLE markets (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_name  VARCHAR(150) NOT NULL,
    address      VARCHAR(255) NOT NULL,
    district     VARCHAR(100) NULL,
    city         VARCHAR(100) NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    latitude     DECIMAL(10, 8) NOT NULL,
    longitude    DECIMAL(11, 8) NOT NULL,
    map_provider VARCHAR(30) NOT NULL DEFAULT 'osm',
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    image_url    VARCHAR(255) NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Tên chợ là khoá tự nhiên: db/seed.sql (FR-100) dựa vào đây để chạy lại được nhiều lần.
    UNIQUE KEY uq_market_name (market_name),
    INDEX idx_markets_city_active (city, is_active)
);

CREATE TABLE market_operating_days (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_id   BIGINT UNSIGNED NOT NULL,
    day_of_week TINYINT NOT NULL,
    CONSTRAINT fk_mod_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_market_day (market_id, day_of_week),
    CONSTRAINT ck_mod_day CHECK (day_of_week BETWEEN 0 AND 6)
);

-- FR-010 "view the list of Farmers present at each market". Không có bảng này thì trang chợ rỗng.
CREATE TABLE farmer_markets (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_id       BIGINT UNSIGNED NOT NULL,
    market_id       BIGINT UNSIGNED NOT NULL,
    stall_code      VARCHAR(30) NULL,
    stall_latitude  DECIMAL(10, 8) NULL,
    stall_longitude DECIMAL(11, 8) NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fm_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_fm_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_farmer_market (farmer_id, market_id),
    INDEX idx_fm_market_active (market_id, is_active)
);
