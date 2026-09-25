package com.techx.intervue.modules.conversation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-115. messageId NULL = đã upload nhưng chưa gắn vào tin nào; ChatAttachmentCleanupJob dọn sau
 * 24 giờ. storageKey là tên file trên đĩa, sinh ngẫu nhiên, không bao giờ lấy từ người dùng.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "message_attachments")
public class MessageAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "uploader_id", nullable = false, updatable = false)
    private Long uploaderId;

    @Column(name = "storage_key", nullable = false, updatable = false, length = 255)
    private String storageKey;

    @Column(nullable = false, length = 50, updatable = false)
    private String mime;

    @Column(name = "size_bytes", nullable = false, updatable = false)
    private Integer sizeBytes;

    @Column(updatable = false)
    private Integer width;

    @Column(updatable = false)
    private Integer height;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /** Giống Message: không ghi đè khi đã có giá trị, để test đặt được mốc thời gian. */
    @PrePersist
    protected void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
