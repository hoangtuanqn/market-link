package com.techx.intervue.modules.review.repositories;

import com.techx.intervue.modules.review.entities.ReviewResponse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewResponseRepository extends JpaRepository<ReviewResponse, Long> {

    boolean existsByReviewId(Long reviewId);
}
