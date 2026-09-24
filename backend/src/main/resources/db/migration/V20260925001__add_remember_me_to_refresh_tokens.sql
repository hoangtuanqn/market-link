-- "Remember me" khi đăng nhập: false thì cookie refresh_token là cookie phiên (mất khi đóng trình duyệt).
-- Token xoay vòng (rotation) giữ nguyên giá trị của token cũ. Token đã có coi như được ghi nhớ.
ALTER TABLE refresh_tokens
    ADD COLUMN remember_me BOOLEAN NOT NULL DEFAULT TRUE AFTER revoked;
