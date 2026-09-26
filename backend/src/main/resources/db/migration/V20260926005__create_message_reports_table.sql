-- FR-116 (spec §5.1). Admin chỉ đọc được tin ĐÃ có hàng ở bảng này (spec §8.3) — quyền đọc của
-- admin bắt nguồn từ báo cáo, không phải từ vai.
CREATE TABLE message_reports (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id  BIGINT UNSIGNED NOT NULL,
  reported_by BIGINT UNSIGNED NOT NULL,
  reason      ENUM('spam','abuse','scam','other') NOT NULL,
  note        VARCHAR(255) NULL,
  status      ENUM('new','reviewed','actioned') NOT NULL DEFAULT 'new',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(6) NULL,
  created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_report_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  -- Tài khoản không bao giờ xoá cứng (FR-072 chỉ vô hiệu hoá) nên để RESTRICT mặc định
  CONSTRAINT fk_report_reporter FOREIGN KEY (reported_by) REFERENCES users(id),
  CONSTRAINT fk_report_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  -- Một người báo một tin đúng một lần (spec §5.1)
  CONSTRAINT uq_report_once UNIQUE (message_id, reported_by),
  INDEX idx_reports_status (status, created_at)
) ENGINE=InnoDB;
