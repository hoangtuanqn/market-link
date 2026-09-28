-- V20260928003__add_customer_deactivation_fields.sql
-- FR-072: an expiry and a reason for the current deactivation, plus an append-only history of every
-- deactivate/reactivate so the admin can see who did what and why.

ALTER TABLE users
  ADD COLUMN deactivated_until DATETIME NULL COMMENT 'NULL = permanent when status = inactive',
  ADD COLUMN deactivation_reason VARCHAR(255) NULL;

CREATE TABLE user_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NULL,
  until DATETIME NULL,
  changed_by BIGINT UNSIGNED NULL COMMENT 'NULL = the system (cron auto-reactivate)',
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_status_history_user (user_id, changed_at),
  CONSTRAINT fk_user_status_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_status_history_actor FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
