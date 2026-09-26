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

/** FR-062 sản phẩm của một stall. Bảng `products` (V20260926010). */
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

    /** D-02: trừ ngay khi khách đặt, hoàn khi đơn declined/cancelled. Không bao giờ âm (CHECK). */
    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Convert(converter = ProductStatus.DbConverter.class)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.AVAILABLE;

    /** Xoá mềm của Farmer: order_items cũ vẫn trỏ về được. */
    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    /** Admin ẩn listing vi phạm (FR-074); Farmer không tự gỡ được. */
    @Column(name = "is_hidden", nullable = false)
    private boolean hidden;

    @Column(name = "hidden_reason", length = 255)
    private String hiddenReason;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;
}
