-- FR-115 (spec 2026-09-28-chat-media-design §4): a chat message can carry a video.
ALTER TABLE messages
    MODIFY kind ENUM ('text', 'image', 'video', 'offer', 'system') NOT NULL DEFAULT 'text';
