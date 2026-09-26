package com.techx.intervue.modules.product.entities;

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

/**
 * FR-063: how much of one product a stall usually brings on one weekday. Table {@code
 * weekly_stock_templates} (V20260926017).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "weekly_stock_templates")
public class WeeklyStockTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    /** 0 = Sunday … 6 = Saturday, like farmer_operating_days. */
    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "default_quantity", nullable = false)
    private int defaultQuantity;

    /** Null keeps the product's current price when the template is applied. */
    @Column(name = "default_price", precision = 10, scale = 2)
    private BigDecimal defaultPrice;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
