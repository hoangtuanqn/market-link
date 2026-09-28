package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.entities.QualityReport;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QualityReportRepository extends JpaRepository<QualityReport, Long> {

    /** One report per order line (spec §4.4.1): asked first so a second try is a 409, not a 500. */
    boolean existsByOrderItemId(Long orderItemId);

    /**
     * Two admins deciding the same report, or a stall editing its reply while an admin decides: the
     * second waits for the first and then sees the report as it left it.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from QualityReport r where r.id = :id")
    Optional<QualityReport> lockById(@Param("id") Long id);
}
