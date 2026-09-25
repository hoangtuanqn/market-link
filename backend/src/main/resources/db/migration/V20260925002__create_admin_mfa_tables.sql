-- FR-008 (đề xuất): xác thực hai bước TOTP cho admin.
-- secret_encrypted: khoá TOTP mã hoá AES-256-GCM bằng MFA_ENCRYPTION_KEY (Base64 iv + ciphertext + tag).
-- enabled_at NULL = đã tạo khoá (đang quét QR) nhưng chưa xác nhận mã → chưa bật.
-- last_used_step: bước 30 giây của mã đúng gần nhất, chỉ nhận bước lớn hơn để chặn dùng lại mã.
CREATE TABLE admin_mfa (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    secret_encrypted VARCHAR(255) NOT NULL,
    enabled_at TIMESTAMP NULL,
    last_used_step BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Mã khôi phục dùng một lần, chỉ lưu SHA-256 hex; mã gốc chỉ hiện một lần khi bật.
CREATE TABLE admin_mfa_recovery_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    code_hash CHAR(64) NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_mfa_recovery_user_code (user_id, code_hash)
);
