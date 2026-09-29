package com.techx.intervue.modules.stall.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "farmer_markets")
public class FarmerMarket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "market_id", nullable = false)
    private Long marketId;

    @Column(name = "stall_code", length = 30)
    private String stallCode;

    @Column(name = "stall_latitude", precision = 10, scale = 8)
    private BigDecimal stallLatitude;

    @Column(name = "stall_longitude", precision = 11, scale = 8)
    private BigDecimal stallLongitude;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
