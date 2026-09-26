package com.techx.intervue.modules.product.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A product's stock for exactly one pickup date — replaces the single shared {@code
 * products.stock_quantity} that used to cover every date. Materialized on demand from {@code
 * weekly_stock_templates} the first time it's needed (order/preview/browse); a Farmer never creates
 * one by hand. Table {@code product_daily_stock}.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "product_daily_stock")
public class ProductDailyStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "stock_date", nullable = false)
    private LocalDate stockDate;

    @Column(name = "quantity_available", nullable = false)
    private int quantityAvailable;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
}
