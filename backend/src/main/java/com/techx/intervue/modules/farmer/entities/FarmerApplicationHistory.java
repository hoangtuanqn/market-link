package com.techx.intervue.modules.farmer.entities;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
 * One Farmer application, a snapshot of its content at submission. {@code farmer_profiles} is
 * overwritten when the user re-applies so it cannot keep history; this table keeps it, so both the
 * applicant and the Admin can check why the previous one was rejected.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "farmer_application_history")
public class FarmerApplicationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Which submission this is for the account, starting at 1. */
    @Column(name = "attempt", nullable = false)
    private Integer attempt;

    @Column(name = "stall_name", nullable = false, length = 120)
    private String stallName;

    @Column(name = "contact_person", nullable = false, length = 100)
    private String contactPerson;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Several paths separated by ';' — same convention as farmer_profiles. */
    @Column(name = "photo_paths", columnDefinition = "TEXT")
    private String photoPaths;

    @Column(name = "video_path", length = 255)
    private String videoPath;

    @Convert(converter = ApprovalStatus.DbConverter.class)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ApprovalStatus status = ApprovalStatus.PENDING;

    @Column(name = "reject_reason", length = 255)
    private String rejectReason;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "submitted_at", updatable = false)
    private Instant submittedAt;

    @PrePersist
    protected void onCreated() {
        if (submittedAt == null) {
            submittedAt = Instant.now();
        }
    }
}
