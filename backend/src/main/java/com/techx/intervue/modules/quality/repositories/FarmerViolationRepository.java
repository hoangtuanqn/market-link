package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.entities.FarmerViolation;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FarmerViolationRepository extends JpaRepository<FarmerViolation, Long> {

    /** FR-123: when the stall's strikes made after {@code since} were recorded, newest first. */
    @Query(
            "select v.createdAt from FarmerViolation v where v.farmerId = :farmerId"
                    + " and v.createdAt > :since order by v.createdAt desc, v.id desc")
    List<Instant> activeTimes(@Param("farmerId") Long farmerId, @Param("since") Instant since);
}
