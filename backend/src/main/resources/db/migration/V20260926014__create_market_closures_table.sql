-- Chưa có FR chính thức trong .ai/REQUIREMENTS.md — panel "Closed days" trên form Market đã tồn
-- tại ở FE từ trước (chạy trên demo data) nhưng chưa có bảng thật. Đề xuất LEAD bổ sung FR và
-- đối chiếu vào db/schema.sql (R-02 — bảng dưới đây do BE tự đề xuất, chưa được LEAD duyệt).
CREATE TABLE market_closures (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    market_id   BIGINT UNSIGNED NOT NULL,
    closed_on   DATE NOT NULL,
    reason      VARCHAR(255) NULL,
    handling    VARCHAR(20) NOT NULL,
    announced   BOOLEAN NOT NULL DEFAULT FALSE,
    created_by  BIGINT UNSIGNED NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_market_closures_market FOREIGN KEY (market_id) REFERENCES markets (id),
    CONSTRAINT fk_market_closures_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    -- Một chợ không thể có hai lý do đóng cửa khác nhau cho cùng một ngày.
    UNIQUE KEY uq_market_closure_day (market_id, closed_on)
);
