package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerApplicationHistoryRepository
        extends JpaRepository<FarmerApplicationHistory, Long> {

    List<FarmerApplicationHistory> findByUserIdOrderByAttemptDesc(Long userId);

    Optional<FarmerApplicationHistory> findFirstByUserIdOrderByAttemptDesc(Long userId);

    long countByUserId(Long userId);
}
