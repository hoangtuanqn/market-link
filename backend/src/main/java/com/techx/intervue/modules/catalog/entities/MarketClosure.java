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

/**
 * One day a market does not open despite falling on its usual schedule (V20260926014). No official
 * FR yet.
 */
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
     * 'move' | 'contact' | 'cancel' — checked in the service, not an enum, to match how
     * FarmerProfile already validates status by String (AdminFarmerController).
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
