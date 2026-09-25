-- FR-115 (spec §5.1). message_id NULL = vừa upload, chưa gắn vào tin nào; job dọn sau 24 giờ.
-- storage_key là tên sinh ngẫu nhiên, KHÔNG phải tên người dùng đặt (spec §8.2).
CREATE TABLE message_attachments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NULL,
  uploader_id BIGINT UNSIGNED NOT NULL,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  mime        VARCHAR(50) NOT NULL,
  size_bytes  INT NOT NULL,
  width       INT NULL,
  height      INT NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_attach_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  -- Tài khoản không bao giờ xoá cứng (FR-072 chỉ vô hiệu hoá) nên để RESTRICT mặc định
  CONSTRAINT fk_attach_uploader FOREIGN KEY (uploader_id) REFERENCES users(id),
  INDEX idx_attach_orphan (message_id, created_at)
) ENGINE=InnoDB;
