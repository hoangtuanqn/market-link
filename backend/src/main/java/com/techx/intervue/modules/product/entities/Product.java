package com.techx.intervue.modules.product.entities;

import com.techx.intervue.modules.catalog.enums.StorageMode;
import com.techx.intervue.modules.product.enums.ProductStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** FR-062 a stall's product. Table `products` (V20260926010). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, length = 20)
    private String unit;

    /**
     * D-02: deducted immediately when the customer orders, restored when the order is
     * declined/cancelled. Never negative (CHECK).
     */
    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    /**
     * FR-121: number of days the product stays good from pickup — shown to the Customer for
     * transparency, compared with the storage group's suggestion when saved.
     */
    @Column(name = "shelf_life_days", nullable = false)
    private int shelfLifeDays;

    /** FR-120: the storage group the suggestion came from; null = the category's own range. */
    @Column(name = "shelf_life_guide_id")
    private Long shelfLifeGuideId;

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode = StorageMode.ROOM;

    /**
     * The suggestion when the product was last saved, so a later change to the guide does not
     * re-label the product.
     */
    @Column(name = "suggested_shelf_life_days")
    private Integer suggestedShelfLifeDays;

    /** FR-121: shelfLifeDays is longer than the suggestion, and the Farmer confirmed it. */
    @Column(name = "shelf_life_extended", nullable = false)
    private boolean shelfLifeExtended;

    /** When the Farmer ticked the promise for the longer shelf life; null when not extended. */
    @Column(name = "shelf_life_ack_at")
    private LocalDateTime shelfLifeAckAt;

    @Convert(converter = ProductStatus.DbConverter.class)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.AVAILABLE;

    /** The Farmer's soft delete: old order_items can still point back to it. */
    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    /** An admin hides a violating listing (FR-074); the Farmer cannot remove it themself. */
    @Column(name = "is_hidden", nullable = false)
    private boolean hidden;

    @Column(name = "hidden_reason", length = 255)
    private String hiddenReason;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;
}
