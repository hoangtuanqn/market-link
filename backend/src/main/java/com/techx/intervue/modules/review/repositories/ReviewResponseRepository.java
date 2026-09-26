package com.techx.intervue.modules.review.repositories;

import com.techx.intervue.modules.review.entities.ReviewResponse;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewResponseRepository extends JpaRepository<ReviewResponse, Long> {

    /** 1-1: a second answer is a 409, not a second row. */
    boolean existsByReviewId(Long reviewId);
}
