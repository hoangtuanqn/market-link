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

    /** Tên category, cách nhau bởi dấu phẩy — chưa có bảng categories thật (module Product). */
    @Column(name = "categories", length = 255)
    private String categories;

    @Column(name = "main_crops", length = 255)
    private String mainCrops;

    @Column(name = "weekly_volume", length = 100)
    private String weeklyVolume;

    @Column(name = "growing_method", columnDefinition = "TEXT")
    private String growingMethod;

    /** Chỉ Admin thấy — không hiển thị công khai (khác với địa chỉ gian hàng tại chợ). */
    @Column(name = "plot_address", length = 255)
    private String plotAddress;

    @Column(name = "plot_size", length = 50)
    private String plotSize;

    @Column(name = "growing_since_year")
    private Integer growingSinceYear;

    @Column(name = "plot_latitude", precision = 10, scale = 8)
    private BigDecimal plotLatitude;

    @Column(name = "plot_longitude", precision = 11, scale = 8)
    private BigDecimal plotLongitude;

    /** Nhiều path cách nhau bởi ';' — xem FarmerService#joinPaths/#splitPaths. */
    @Column(name = "photo_paths", columnDefinition = "TEXT")
    private String photoPaths;

    @Column(name = "video_path", length = 255)
    private String videoPath;

    /** Tên chợ tự do — chưa có bảng markets thật (module Market). */
    @Column(name = "preferred_market_name", length = 120)
    private String preferredMarketName;

    @Convert(converter = ApprovalStatus.DbConverter.class)
    @Column(name = "approval_status", nullable = false)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    /** Lý do Admin từ chối — chỉ có giá trị khi approvalStatus = REJECTED. */
    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "approved_by")
    private Long approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

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
