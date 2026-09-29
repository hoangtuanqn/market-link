package com.techx.intervue.modules.farmer.entities;

import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "farmer_status_history")
public class FarmerStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Convert(converter = ApprovalStatus.DbConverter.class)
    @Column(name = "from_status", nullable = false, length = 20)
    private ApprovalStatus fromStatus;

    @Convert(converter = ApprovalStatus.DbConverter.class)
    @Column(name = "to_status", nullable = false, length = 20)
    private ApprovalStatus toStatus;

    @Column(length = 255)
    private String reason;

    private Instant until;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", insertable = false, updatable = false)
    private Instant changedAt;
}
