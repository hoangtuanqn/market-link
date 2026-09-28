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
 *
 * <p>FR-124: a day can be on a near-expiry deal (V20260928007). Its four deal columns are set and
 * cleared together (ck_pds_deal_all_or_none); {@code unitPrice} is then the deal price.
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

    /** The day's price before its near-expiry deal; null when the day has no deal. */
    @Column(name = "list_price", precision = 10, scale = 2)
    private BigDecimal listPrice;

    /** 5–70, in steps of 5 (DealPolicy). */
    @Column(name = "discount_percent")
    private Integer discountPercent;

    /** When the batch brought for this day was harvested or packed. */
    @Column(name = "packed_on")
    private LocalDate packedOn;

    /**
     * The batch's last good day, fixed when the deal is posted: changing the product's shelf life
     * later leaves it alone (spec §8).
     */
    @Column(name = "best_before")
    private LocalDate bestBefore;

    public boolean hasDeal() {
        return discountPercent != null;
    }

    /** The day's normal price: the one a deal replaced, else the current one. */
    public BigDecimal basePrice() {
        return hasDeal() ? listPrice : unitPrice;
    }

    /**
     * Puts the day on a deal. Posting again keeps the first list price, so a new discount is taken
     * off the normal price and never compounds.
     */
    public void startDeal(
            BigDecimal dealPrice, int percent, LocalDate packedOn, LocalDate bestBefore) {
        this.listPrice = basePrice();
        this.unitPrice = dealPrice;
        this.discountPercent = percent;
        this.packedOn = packedOn;
        this.bestBefore = bestBefore;
    }

    /**
     * Back to the normal price; the quantity stays as it is. A day without a deal is left alone.
     */
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
