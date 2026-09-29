package com.techx.intervue.modules.review.entities;

import jakarta.persistence.Column;
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
@Table(name = "review_responses")
public class ReviewResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "response_text", nullable = false, columnDefinition = "TEXT")
    private String responseText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
