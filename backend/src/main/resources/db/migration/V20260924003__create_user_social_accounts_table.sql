-- Đăng nhập bằng Google / Facebook (OAuth2 authorization code flow).
-- Liên kết theo provider_user_id (Google "sub", Facebook "id") vì email có thể đổi.
CREATE TABLE user_social_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    provider ENUM('google', 'facebook') NOT NULL,
    provider_user_id VARCHAR(191) NOT NULL,
    email VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_social_provider_user (provider, provider_user_id),
    UNIQUE KEY uq_social_user_provider (user_id, provider)
);

-- Tài khoản tạo từ Google/Facebook chưa có mật khẩu và số điện thoại
ALTER TABLE users
    MODIFY COLUMN password_hash VARCHAR(255) NULL,
    MODIFY COLUMN phone VARCHAR(20) NULL;
