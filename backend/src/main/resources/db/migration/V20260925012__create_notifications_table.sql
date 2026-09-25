-- FR-042 / D-11: thông báo lưu lại cho từng người. kind là VARCHAR (enum Java NotificationKind) để thêm
-- loại mới (đơn hàng, restock) không cần migration. Text đã dịch sẵn theo ngôn ngữ người nhận lúc tạo,
-- vì Web Push được service worker hiện, không có bộ dịch của app.
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    kind VARCHAR(40) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255) NULL,
    announcement_id BIGINT UNSIGNED NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user (user_id, is_read, created_at)
);
