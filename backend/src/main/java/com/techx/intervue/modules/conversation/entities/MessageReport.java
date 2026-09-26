package com.techx.intervue.modules.conversation.entities;

import com.techx.intervue.modules.conversation.enums.ReportReason;
import com.techx.intervue.modules.conversation.enums.ReportStatus;
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

/** FR-116. Reports are never deleted: they are the audit trail of a moderation decision. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "message_reports")
public class MessageReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false, updatable = false)
    private Long messageId;

    @Column(name = "reported_by", nullable = false, updatable = false)
    private Long reportedBy;

    @Convert(converter = ReportReason.DbConverter.class)
    @Column(nullable = false, updatable = false)
    private ReportReason reason;

    @Column(length = 255, updatable = false)
    private String note;

    @Convert(converter = ReportStatus.DbConverter.class)
    @Column(nullable = false)
    @Builder.Default
    private ReportStatus status = ReportStatus.NEW;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /**
     * Same as Message: do not overwrite when a value already exists, so tests can set the
     * timestamp.
     */
    @PrePersist
    protected void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /**
     * Records who handled it and when. Calling it again changes nothing: when two admins work the
     * same queue, the one who handled it FIRST is accountable, and overwriting would erase that
     * trace.
     */
    public void markHandledBy(Long adminId, ReportStatus outcome, Instant at) {
        if (this.status != ReportStatus.NEW) {
            return;
        }
        this.status = outcome;
        this.reviewedBy = adminId;
        this.reviewedAt = at;
    }
}
