-- D-09: Farmer bị đình chỉ vẫn đăng nhập được nhưng hàng bị ẩn — họ phải đọc được vì sao, giống như
-- người bị từ chối đơn đọc được reject_reason. Lưu thêm ai đình chỉ và lúc nào để khối History của
-- Admin có mốc cho việc này (trước đó chỉ có approved_by/approved_at).
ALTER TABLE farmer_profiles
    ADD COLUMN suspend_reason VARCHAR(255) NULL AFTER reject_reason,
    ADD COLUMN suspended_by   BIGINT UNSIGNED NULL AFTER approved_at,
    ADD COLUMN suspended_at   DATETIME NULL AFTER suspended_by,
    ADD CONSTRAINT fk_farmer_profiles_suspended_by
        FOREIGN KEY (suspended_by) REFERENCES users (id) ON DELETE SET NULL;
