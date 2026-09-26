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
 * FR-073 chợ phiên; FR-010/FR-012 khách duyệt và xem trên bản đồ. Bảng `markets` (V20260926008).
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

    /** D-12: luôn 'osm'. Giữ cột theo schema gợi ý của đề. */
    @Column(name = "map_provider", nullable = false, length = 30)
    private String mapProvider = "osm";

    @Column(name = "opening_time", nullable = false)
    private LocalTime openingTime;

    @Column(name = "closing_time", nullable = false)
    private LocalTime closingTime;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    /** Xoá mềm: orders.market_id là FK không nullable, không xoá dòng được. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
