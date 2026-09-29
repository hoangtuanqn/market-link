package com.techx.intervue.modules.quality.repositories;

import com.techx.intervue.modules.quality.entities.QualityReport;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QualityReportRepository extends JpaRepository<QualityReport, Long> {

    boolean existsByOrderItemId(Long orderItemId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from QualityReport r where r.id = :id")
    Optional<QualityReport> lockById(@Param("id") Long id);
}
