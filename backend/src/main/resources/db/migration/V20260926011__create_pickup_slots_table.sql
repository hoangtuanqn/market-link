-- FR-032, FR-067, D-06. Một slot = một Farmer, một chợ, một ngày, một khung giờ.
-- Khoá BIGINT UNSIGNED, PK `id` — cùng lý do đã ghi ở V20260925007 và V20260926008.
CREATE TABLE pickup_slots (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    farmer_market_id BIGINT UNSIGNED NOT NULL,
    slot_date        DATE NOT NULL,
    start_time       TIME NOT NULL,
    end_time         TIME NOT NULL,
    max_orders       INT NOT NULL DEFAULT 5,
    booked_count     INT NOT NULL DEFAULT 0,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_farmer_market FOREIGN KEY (farmer_market_id)
        REFERENCES farmer_markets (id) ON DELETE CASCADE,
    UNIQUE KEY uq_slot (farmer_market_id, slot_date, start_time),
    INDEX idx_slot_date (slot_date, is_active),
    -- D-06: hàng rào cuối cùng. Kể cả khi code sai, database vẫn không cho vượt slot.
    CONSTRAINT ck_slot_capacity CHECK (booked_count >= 0 AND booked_count <= max_orders)
);
