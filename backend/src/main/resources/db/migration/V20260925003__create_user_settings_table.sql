-- Tuỳ chọn hiển thị của mỗi tài khoản (trang Settings của cả ba vai). Chưa có dòng = dùng mặc định.
-- extras_json: thông báo và khối riêng của từng vai (đã lưu, chưa có tính năng dùng tới), dạng {"key": "value"}.
CREATE TABLE user_settings (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    theme VARCHAR(10) NOT NULL DEFAULT 'light',
    language VARCHAR(5) NOT NULL DEFAULT 'en',
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    units VARCHAR(10) NOT NULL DEFAULT 'metric',
    date_format VARCHAR(5) NOT NULL DEFAULT 'dmy',
    clock VARCHAR(5) NOT NULL DEFAULT 'h24',
    preferred_market VARCHAR(60) NULL,
    extras_json TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
