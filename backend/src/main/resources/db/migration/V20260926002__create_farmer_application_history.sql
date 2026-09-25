-- Mỗi lần Customer nộp đơn xin thành Farmer là một hàng ở đây, kèm ảnh chụp lại nội dung lúc nộp và
-- kết quả Admin đã quyết. farmer_profiles vẫn là "đơn hiện tại" (UNIQUE user_id) như db/schema.sql §2
-- của LEAD; bảng này chỉ thêm phần lịch sử mà bảng kia không giữ được vì bị ghi đè khi nộp lại.
--
-- Vì sao cần: bị từ chối là ngõ cụt nếu không cho nộp lại, mà cho nộp lại thì nội dung và lý do từ
-- chối của lần trước biến mất — cả người nộp lẫn Admin đều không còn gì để đối chiếu.
CREATE TABLE farmer_application_history (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT UNSIGNED NOT NULL,
    -- Lần nộp thứ mấy của tài khoản này, bắt đầu từ 1.
    attempt        INT UNSIGNED NOT NULL,
    stall_name     VARCHAR(120) NOT NULL,
    contact_person VARCHAR(100) NOT NULL,
    description    TEXT NULL,
    photo_paths    TEXT NULL,
    video_path     VARCHAR(255) NULL,
    -- pending khi còn chờ; approved/rejected khi Admin đã quyết. Không có suspended: đình chỉ là
    -- việc của gian hàng đã duyệt, không phải kết quả của một lần nộp đơn.
    status         ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    reject_reason  VARCHAR(255) NULL,
    decided_by     BIGINT UNSIGNED NULL,
    decided_at     DATETIME NULL,
    submitted_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_farmer_app_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_farmer_app_history_decided_by FOREIGN KEY (decided_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT uq_farmer_app_history_attempt UNIQUE (user_id, attempt),
    INDEX idx_farmer_app_history_user (user_id, submitted_at)
) ENGINE = InnoDB;

-- Hồ sơ đã có trước khi bảng này tồn tại vẫn phải có lần nộp đầu tiên, nếu không lịch sử của họ trống.
INSERT INTO farmer_application_history
    (user_id, attempt, stall_name, contact_person, description, photo_paths, video_path,
     status, reject_reason, decided_by, decided_at, submitted_at)
SELECT p.user_id, 1, p.stall_name, p.contact_person, p.description, p.photo_paths, p.video_path,
       CASE p.approval_status
           WHEN 'rejected' THEN 'rejected'
           WHEN 'pending'  THEN 'pending'
           ELSE 'approved'
       END,
       p.reject_reason, p.approved_by, p.approved_at, p.created_at
FROM farmer_profiles p;
