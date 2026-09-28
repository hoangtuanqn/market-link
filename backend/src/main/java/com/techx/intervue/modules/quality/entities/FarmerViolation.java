package com.techx.intervue.modules.quality.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-123: one shelf-life strike, recorded when an admin confirms a report on an extended shelf life
 * that spoiled before its promise (table {@code farmer_violations}, V20260928014). It counts for 90
 * days from {@code createdAt}; strikes are never edited or deleted (spec §12).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "farmer_violations")
public class FarmerViolation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** farmer_profiles.id, not users.id. */
    @Column(name = "farmer_id", nullable = false, updatable = false)
    private Long farmerId;

    @Column(name = "quality_report_id", nullable = false, updatable = false)
    private Long qualityReportId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "extended_by_days", nullable = false, updatable = false)
    private int extendedByDays;

    @Column(length = 255, updatable = false)
    private String note;

    /** users.id of the admin who confirmed the report. */
    @Column(name = "created_by", nullable = false, updatable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
