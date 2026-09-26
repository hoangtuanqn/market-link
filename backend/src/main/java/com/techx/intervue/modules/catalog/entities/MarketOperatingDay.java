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

/** Chợ họp thứ mấy trong tuần: 0 = Chủ nhật … 6 = Thứ bảy (contract §3). */
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
