package com.techx.intervue.modules.review.repositories;

import com.techx.intervue.modules.review.entities.Review;
import com.techx.intervue.modules.review.enums.ReviewTarget;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * "Already reviewed" checks (409). MySQL treats NULLs as distinct inside {@code uq_review}, so
     * the service asks here, in the same transaction, before inserting.
     */
    boolean existsByOrderIdAndTargetTypeAndProductId(
            Long orderId, ReviewTarget targetType, Long productId);

    boolean existsByOrderIdAndTargetTypeAndFarmerId(
            Long orderId, ReviewTarget targetType, Long farmerId);
}
