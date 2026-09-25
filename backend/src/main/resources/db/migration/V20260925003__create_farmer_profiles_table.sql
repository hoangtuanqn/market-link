-- FR-002 (second route, chưa có ID chính thức — xem caption ở CustomerBecomeFarmer/index.tsx):
-- Customer đang đăng nhập nộp đơn xin thành Farmer. Cột đặt tên theo db/schema.sql §9
-- farmer_profiles (LEAD), chỉ lấy các cột cần cho bước duyệt (D-09); description/logo_url/
-- order_cutoff_hours/rating_* thuộc các bước Farmer profile/Product/Review sau này.
-- FK tới users dùng BIGINT UNSIGNED để khớp users.id thật (không phải INT như schema.sql).
CREATE TABLE farmer_profiles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL UNIQUE,
    stall_name      VARCHAR(120) NOT NULL,
    contact_person  VARCHAR(100) NOT NULL,
    -- Giữ 'rejected' để khớp enum đích của schema.sql, dù bước này chưa dùng transition đó.
    approval_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
    approved_by     BIGINT UNSIGNED NULL,
    approved_at     DATETIME NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_farmer_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_profiles_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_farmer_profiles_approval_status (approval_status)
);
