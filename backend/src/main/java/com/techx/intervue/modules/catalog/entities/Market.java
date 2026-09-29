package com.techx.intervue.modules.catalog.entities;

import com.techx.intervue.modules.geo.entities.AddressColumns;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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

    @Embedded private AddressColumns addressParts;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "map_provider", nullable = false, length = 30)
    private String mapProvider = "osm";

    @Column(name = "opening_time", nullable = false)
    private LocalTime openingTime;

    @Column(name = "closing_time", nullable = false)
    private LocalTime closingTime;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
