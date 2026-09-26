-- FR-042 N3: Web Push. Mỗi trình duyệt đã cho phép thông báo có một endpoint (do dịch vụ push của trình duyệt cấp)
-- và hai khoá để server mã hoá nội dung (RFC 8291). Cùng trình duyệt đăng nhập tài khoản khác → endpoint chuyển chủ.
-- Dịch vụ push trả 404/410 → dòng bị xoá.
CREATE TABLE push_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh VARCHAR(200) NOT NULL,
    auth VARCHAR(100) NOT NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_used_at TIMESTAMP(3) NULL,
    UNIQUE KEY uq_push_endpoint (endpoint),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_push_user (user_id)
);
