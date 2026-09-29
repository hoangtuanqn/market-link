package com.techx.intervue.modules.order.entities;

import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.catalog.services.impl.ShelfLifePolicy;
import com.techx.intervue.modules.product.entities.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "product_name", nullable = false, length = 150)
    private String productName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "shelf_life_days")
    private Integer shelfLifeDays;

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode")
    private StorageMode storageMode;

    @Column(name = "best_before")
    private LocalDate bestBefore;

    @Column(name = "shelf_life_extended", nullable = false)
    private boolean shelfLifeExtended;

    @Column(name = "extended_by_days", nullable = false)
    private int extendedByDays;

    @Column(name = "list_price", precision = 10, scale = 2)
    private BigDecimal listPrice;

    public static OrderItem snapshot(
            Product product,
            BigDecimal unitPrice,
            int quantity,
            BigDecimal subtotal,
            LocalDate pickupDate) {
        OrderItem item = new OrderItem();
        item.setProductId(product.getId());
        item.setProductName(product.getName());
        item.setUnitPrice(unitPrice);
        item.setUnit(product.getUnit());
        item.setQuantity(quantity);
        item.setSubtotal(subtotal);
        item.setShelfLifeDays(product.getShelfLifeDays());
        item.setStorageMode(product.getStorageMode());
        item.setBestBefore(ShelfLifePolicy.bestBefore(pickupDate, product.getShelfLifeDays()));
        item.setShelfLifeExtended(product.isShelfLifeExtended());
        item.setExtendedByDays(
                ShelfLifePolicy.extendedBy(
                        product.getShelfLifeDays(), product.getSuggestedShelfLifeDays()));
        return item;
    }
}
