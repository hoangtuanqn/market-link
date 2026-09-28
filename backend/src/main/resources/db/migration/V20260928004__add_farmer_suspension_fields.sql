-- V20260928004__add_farmer_suspension_fields.sql
-- FR-071 / D-09: an expiry for a suspension (NULL = until an admin lifts it), plus an append-only
-- history of every suspend/reinstate so the admin can see who did what, why, and for how long.
-- suspend_reason / suspended_by / suspended_at already exist and are reused as they are.

ALTER TABLE farmer_profiles
  ADD COLUMN suspended_until DATETIME NULL
    COMMENT 'NULL = permanent while approval_status = suspended';

CREATE TABLE farmer_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  farmer_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  until DATETIME NULL,
  changed_by BIGINT UNSIGNED NULL COMMENT 'NULL = the system (auto-reinstate cron)',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_farmer_status_history_farmer (farmer_id, changed_at),
  CONSTRAINT fk_farmer_status_history_farmer FOREIGN KEY (farmer_id) REFERENCES farmer_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_farmer_status_history_actor FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
