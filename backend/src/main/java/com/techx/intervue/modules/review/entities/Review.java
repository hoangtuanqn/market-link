package com.techx.intervue.modules.review.entities;

import com.techx.intervue.modules.review.enums.ReviewStatus;
import com.techx.intervue.modules.review.enums.ReviewTarget;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Convert(converter = ReviewTarget.DbConverter.class)
    @Column(name = "target_type", nullable = false)
    private ReviewTarget targetType;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "farmer_id")
    private Long farmerId;

    @Column(nullable = false)
    private int rating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Convert(converter = ReviewStatus.DbConverter.class)
    @Column(nullable = false)
    private ReviewStatus status = ReviewStatus.VISIBLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long targetId() {
        return targetType == ReviewTarget.PRODUCT ? productId : farmerId;
    }
}
