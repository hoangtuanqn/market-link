-- FR-092: lưu hội thoại chatbot kèm intent đã nhận diện
CREATE TABLE chat_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    session_key VARCHAR(64) NOT NULL,
    role ENUM('user', 'bot') NOT NULL,
    message TEXT NOT NULL,
    intent VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_chat_session (session_key, created_at)
);
