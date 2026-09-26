-- FR-081: feedback form (bug / suggestion / query) open to visitors; admin works the queue.
-- Keys BIGINT UNSIGNED like V20260926020; columns follow db/schema.sql. user_id NULL = anonymous.
CREATE TABLE feedbacks (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT UNSIGNED NULL,
    type       ENUM('bug','suggestion','query') NOT NULL,
    message    TEXT NOT NULL,
    status     ENUM('new','reviewed','resolved') NOT NULL DEFAULT 'new',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_feedbacks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_feedbacks_status (status, created_at)
);
