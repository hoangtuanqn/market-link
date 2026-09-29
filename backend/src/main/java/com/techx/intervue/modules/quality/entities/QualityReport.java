package com.techx.intervue.modules.quality.entities;

import com.techx.intervue.modules.quality.enums.QualityProblem;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "quality_reports")
public class QualityReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_item_id", nullable = false, updatable = false)
    private Long orderItemId;

    @Column(name = "order_id", nullable = false, updatable = false)
    private Long orderId;

    @Column(name = "customer_id", nullable = false, updatable = false)
    private Long customerId;

    @Column(name = "farmer_id", nullable = false, updatable = false)
    private Long farmerId;

    @Column(name = "product_id", nullable = false, updatable = false)
    private Long productId;

    @Column(name = "spoiled_on", nullable = false, updatable = false)
    private LocalDate spoiledOn;

    @Convert(converter = QualityProblem.DbConverter.class)
    @Column(nullable = false, updatable = false)
    private QualityProblem problem;

    @Column(length = 500, updatable = false)
    private String note;

    @Column(name = "photo_url", length = 255, updatable = false)
    private String photoUrl;

    @Column(name = "before_promise", nullable = false, updatable = false)
    private boolean beforePromise;

    @Column(name = "shelf_life_extended", nullable = false, updatable = false)
    private boolean shelfLifeExtended;

    @Column(name = "extended_by_days", nullable = false, updatable = false)
    private int extendedByDays;

    @Convert(converter = QualityReportStatus.DbConverter.class)
    @Column(nullable = false)
    private QualityReportStatus status = QualityReportStatus.OPEN;

    @Column(name = "farmer_response", length = 500)
    private String farmerResponse;

    @Column(name = "farmer_responded_at")
    private Instant farmerRespondedAt;

    @Column(name = "decided_by")
    private Long decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @Column(name = "decision_note", length = 255)
    private String decisionNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public boolean isOpen() {
        return status == QualityReportStatus.OPEN;
    }

    public void decide(QualityReportStatus outcome, Long adminId, String note, Instant at) {
        this.status = outcome;
        this.decidedBy = adminId;
        this.decisionNote = note;
        this.decidedAt = at;
    }
}
