-- FR-112: "hoạt động 12 phút trước" phải sống qua restart Redis. Online-ngay-lúc-này ở Redis
-- (tập session đang mở); mốc cuối ghi xuống đây khi ngắt kết nối, tiết chế 60 giây/user.
CREATE TABLE user_presence (
    user_id      BIGINT UNSIGNED PRIMARY KEY,
    last_seen_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_user_presence_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
