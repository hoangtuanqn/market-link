package com.techx.intervue.modules.catalog.entities;

import jakarta.persistence.Column;
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

/** Một ngày chợ không mở dù rơi vào lịch họp thường lệ (V20260926014). Chưa có FR chính thức. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "market_closures")
public class MarketClosure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "market_id", nullable = false)
    private Long marketId;

    @Column(name = "closed_on", nullable = false)
    private LocalDate closedOn;

    @Column(name = "reason", length = 255)
    private String reason;

    /**
     * 'move' | 'contact' | 'cancel' — kiểm ở service, không dùng enum để khớp cách FarmerProfile
     * đang xác thực status bằng String (AdminFarmerController).
     */
    @Column(name = "handling", nullable = false, length = 20)
    private String handling;

    @Column(name = "announced", nullable = false)
    private boolean announced;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
