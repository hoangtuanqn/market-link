package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerApplicationHistoryRepository
        extends JpaRepository<FarmerApplicationHistory, Long> {

    /** Newest submission first, so both the Customer and the Admin read from the top down. */
    List<FarmerApplicationHistory> findByUserIdOrderByAttemptDesc(Long userId);

    /**
     * The row waiting for an Admin decision — there is at most one, because re-applying while
     * pending is blocked in the service.
     */
    Optional<FarmerApplicationHistory> findFirstByUserIdOrderByAttemptDesc(Long userId);

    long countByUserId(Long userId);
}
