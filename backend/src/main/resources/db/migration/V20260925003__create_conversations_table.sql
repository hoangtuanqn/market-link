-- FR-110: một thread cho một cặp người dùng. Khoá theo cặp user, không theo vai, vì
-- "A Farmer is a Customer with a stall" (prototype README): hai chủ stall mua qua lại của nhau
-- vẫn chỉ có một thread. user_a_id < user_b_id để cặp (3,7) và (7,3) là cùng một dòng.
-- Khoá ngoại tới users không CASCADE: tài khoản chỉ bị vô hiệu hoá (FR-072), không xoá cứng.
CREATE TABLE conversations (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_a_id         BIGINT UNSIGNED NOT NULL,
    user_b_id         BIGINT UNSIGNED NOT NULL,
    last_message_at   DATETIME(6) NULL,
    last_message_text VARCHAR(160) NULL,
    user_a_read_at    DATETIME(6) NULL,
    user_b_read_at    DATETIME(6) NULL,
    created_at        DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_conversations_user_a FOREIGN KEY (user_a_id) REFERENCES users (id),
    CONSTRAINT fk_conversations_user_b FOREIGN KEY (user_b_id) REFERENCES users (id),
    CONSTRAINT uq_conversation_pair UNIQUE (user_a_id, user_b_id),
    CONSTRAINT chk_conversation_pair_order CHECK (user_a_id < user_b_id),
    INDEX idx_conv_a (user_a_id, last_message_at),
    INDEX idx_conv_b (user_b_id, last_message_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
