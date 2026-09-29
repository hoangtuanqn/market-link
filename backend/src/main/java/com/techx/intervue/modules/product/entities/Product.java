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

    @Column(name = "stock_quantity", nullable = false)
    private int stockQuantity;

    @Column(name = "image_url", length = 255)
    private String imageUrl;

    @Column(name = "shelf_life_days", nullable = false)
    private int shelfLifeDays;

    @Column(name = "shelf_life_guide_id")
    private Long shelfLifeGuideId;

    @Convert(converter = StorageMode.DbConverter.class)
    @Column(name = "storage_mode", nullable = false)
    private StorageMode storageMode = StorageMode.ROOM;

    @Column(name = "suggested_shelf_life_days")
    private Integer suggestedShelfLifeDays;

    @Column(name = "shelf_life_extended", nullable = false)
    private boolean shelfLifeExtended;

    @Column(name = "shelf_life_ack_at")
    private LocalDateTime shelfLifeAckAt;

    @Convert(converter = ProductStatus.DbConverter.class)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.AVAILABLE;

    @Column(name = "is_deleted", nullable = false)
    private boolean deleted;

    @Column(name = "is_hidden", nullable = false)
    private boolean hidden;

    @Column(name = "hidden_reason", length = 255)
    private String hiddenReason;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;
}
