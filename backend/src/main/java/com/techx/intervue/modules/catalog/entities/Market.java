package com.techx.intervue.modules.catalog.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * FR-073 periodic markets; FR-010/FR-012 customers browse them and view them on the map. Table
 * `markets` (V20260926008).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "markets")
public class Market {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "market_name", nullable = false, length = 150)
    private String marketName;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(length = 100)
    private String district;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    /** D-12: always 'osm'. Keep the column per the schema suggested by the brief. */
    @Column(name = "map_provider", nullable = false, length = 30)
    private String mapProvider = "osm";

    @Column(name = "opening_time", nullable = false)
    private LocalTime openingTime;

    @Column(name = "closing_time", nullable = false)
    private LocalTime closingTime;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    /** Soft delete: orders.market_id is a non-nullable FK, so the row cannot be deleted. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
