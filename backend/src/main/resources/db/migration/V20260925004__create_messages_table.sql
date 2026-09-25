-- FR-110, FR-114: tin nhắn trong một thread. product_id / order_id là ngữ cảnh ghim;
-- CHƯA đặt khoá ngoại vì bảng products / orders chưa tồn tại (roadmap backend bước 5, 8).
-- Một migration sau sẽ thêm FK khi hai bảng đó có mặt. hidden_at: admin ẩn, không xoá cứng.
CREATE TABLE messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id       BIGINT UNSIGNED NOT NULL,
    kind            ENUM ('text', 'image', 'offer', 'system') NOT NULL DEFAULT 'text',
    body            VARCHAR(2000) NULL,
    product_id      BIGINT UNSIGNED NULL,
    order_id        BIGINT UNSIGNED NULL,
    hidden_at       DATETIME NULL,
    hidden_by       BIGINT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id),
    CONSTRAINT fk_messages_hidden_by FOREIGN KEY (hidden_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_messages_conv (conversation_id, id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
