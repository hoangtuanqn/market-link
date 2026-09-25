package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.AdminMfa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminMfaRepository extends JpaRepository<AdminMfa, Long> {
    boolean existsByUserIdAndEnabledAtIsNotNull(Long userId);
}
