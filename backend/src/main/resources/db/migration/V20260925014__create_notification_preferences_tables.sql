-- Settings → Thông báo: bật / tắt theo nhóm × kênh, âm thanh, giờ yên tĩnh (Asia/Ho_Chi_Minh).
-- Chưa có dòng = mặc định (mọi nhóm bật cả hai kênh, âm thanh bật, không yên tĩnh). Server đọc để
-- quyết định popup và Web Push. Thay các ô tích "note.*" cũ trong user_settings.extras_json.
CREATE TABLE notification_preferences (
    user_id BIGINT UNSIGNED NOT NULL,
    category VARCHAR(30) NOT NULL,
    in_app BOOLEAN NOT NULL DEFAULT TRUE,
    browser BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, category),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notification_settings (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    sound BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_on BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_from CHAR(5) NOT NULL DEFAULT '22:00',
    quiet_to CHAR(5) NOT NULL DEFAULT '07:00',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
