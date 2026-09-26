package com.techx.intervue.modules.product.entities;

import com.techx.intervue.modules.product.enums.ProductStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
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

    /** Số ngày sản phẩm còn tươi — hiện cho Customer để minh bạch. Chưa có FR chính thức. */
    @Column(name = "shelf_life_days", nullable = false)
    private int shelfLifeDays;

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
