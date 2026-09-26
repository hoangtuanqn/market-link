package com.techx.intervue.modules.catalog.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Which day of the week the market is held: 0 = Sunday … 6 = Saturday (contract §3). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "market_operating_days")
public class MarketOperatingDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "market_id", nullable = false)
    private Long marketId;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;
}
