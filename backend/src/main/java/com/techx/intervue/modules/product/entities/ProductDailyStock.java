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

    @Column(name = "list_price", precision = 10, scale = 2)
    private BigDecimal listPrice;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    @Column(name = "packed_on")
    private LocalDate packedOn;

    @Column(name = "best_before")
    private LocalDate bestBefore;

    public boolean hasDeal() {
        return discountPercent != null;
    }

    public BigDecimal basePrice() {
        return hasDeal() ? listPrice : unitPrice;
    }

    public void startDeal(
            BigDecimal dealPrice, int percent, LocalDate packedOn, LocalDate bestBefore) {
        this.listPrice = basePrice();
        this.unitPrice = dealPrice;
        this.discountPercent = percent;
        this.packedOn = packedOn;
        this.bestBefore = bestBefore;
    }

    public void endDeal() {
        if (!hasDeal()) {
            return;
        }
        this.unitPrice = listPrice;
        this.listPrice = null;
        this.discountPercent = null;
        this.packedOn = null;
        this.bestBefore = null;
    }
}
