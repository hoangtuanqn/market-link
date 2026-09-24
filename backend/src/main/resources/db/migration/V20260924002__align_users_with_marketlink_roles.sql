-- FR-001, FR-002, FR-005: đưa bảng users về đúng db/schema.sql của MarketLink.
-- Migration V20260923003/004 (bảng roles ADMIN/USER/EDITOR) đã merge nên không sửa (R-03),
-- migration này thay thế chúng bằng cột users.role với 3 vai customer/farmer/admin.

ALTER TABLE users
    RENAME COLUMN name TO full_name,
    RENAME COLUMN password TO password_hash;

ALTER TABLE users
    MODIFY COLUMN full_name VARCHAR(100) NOT NULL,
    ADD COLUMN role ENUM('customer', 'farmer', 'admin') NOT NULL DEFAULT 'customer' AFTER password_hash,
    ADD COLUMN status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' AFTER address;

-- Giữ quyền admin của tài khoản cũ (nếu có), còn lại thành customer
UPDATE users u
    JOIN roles r ON r.id = u.role_id
SET u.role = 'admin'
WHERE r.name = 'ADMIN';

-- Role luôn do server gán khi đăng ký, không để DB tự đoán
ALTER TABLE users
    ALTER COLUMN role DROP DEFAULT;

ALTER TABLE users
    DROP FOREIGN KEY fk_role_id;

ALTER TABLE users
    DROP COLUMN role_id,
    ADD INDEX idx_users_role_status (role, status);

DROP TABLE roles;
