package com.techx.intervue.modules.farmer.entities;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "farmer_profiles")
public class FarmerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "stall_name", nullable = false, length = 120)
    private String stallName;

    @Column(name = "contact_person", nullable = false, length = 100)
    private String contactPerson;

    /** "About the stall" — optional, shown on the future stall page as the farmer's own words. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Nhiều path cách nhau bởi ';' — xem FarmerService#joinList/#splitList. */
    @Column(name = "photo_paths", columnDefinition = "TEXT")
    private String photoPaths;

    @Column(name = "video_path", length = 255)
    private String videoPath;

    /** Ảnh đại diện gian hàng (FR-060, V20260926009). */
    @Column(name = "logo_url", length = 255)
    private String logoUrl;

    /** D-05: đơn khoá sửa/huỷ trước giờ nhận ngần này giờ. Farmer chỉnh trong hồ sơ, 1…72. */
    @Column(name = "order_cutoff_hours", nullable = false)
    @Builder.Default
    private int orderCutoffHours = 12;

    /** Cache điểm đánh giá — tính lại mỗi khi có review (cụm C8). */
    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    private int ratingCount = 0;

    @Convert(converter = ApprovalStatus.DbConverter.class)
    @Column(name = "approval_status", nullable = false)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    /** Lý do Admin từ chối — chỉ có giá trị khi approvalStatus = REJECTED. */
    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    /** Lý do Admin đình chỉ — chỉ có giá trị khi approvalStatus = SUSPENDED. */
    @Column(name = "suspend_reason", length = 255)
    private String suspendReason;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "suspended_by")
    private Long suspendedBy;

    @Column(name = "suspended_at")
    private Instant suspendedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreated() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdated() {
        updatedAt = Instant.now();
    }
}
