package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.AdminMfaRecoveryCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminMfaRecoveryCodeRepository extends JpaRepository<AdminMfaRecoveryCode, Long> {
    Optional<AdminMfaRecoveryCode> findByUserIdAndCodeHashAndUsedAtIsNull(
            Long userId, String codeHash);

    long countByUserIdAndUsedAtIsNull(Long userId);

    @Modifying
    @Query("DELETE FROM AdminMfaRecoveryCode c WHERE c.userId = :userId")
    void deleteAllByUserId(Long userId);
}
