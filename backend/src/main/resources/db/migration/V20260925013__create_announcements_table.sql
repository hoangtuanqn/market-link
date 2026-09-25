-- FR-077: admin đăng thông báo toàn nền tảng. Đăng = mỗi user active thuộc audience nhận một dòng
-- notifications; is_active / starts_at / ends_at chỉ điều khiển banner ở trang public.
CREATE TABLE announcements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content VARCHAR(1000) NOT NULL,
    audience VARCHAR(20) NOT NULL DEFAULT 'all',
    created_by BIGINT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMP NULL,
    ends_at TIMESTAMP NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_announcement
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL;
