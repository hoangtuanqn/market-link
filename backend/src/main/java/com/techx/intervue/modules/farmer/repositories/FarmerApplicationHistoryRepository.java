package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerApplicationHistory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerApplicationHistoryRepository
        extends JpaRepository<FarmerApplicationHistory, Long> {

    /** Lần nộp mới nhất trước, để cả Customer lẫn Admin đọc từ trên xuống. */
    List<FarmerApplicationHistory> findByUserIdOrderByAttemptDesc(Long userId);

    /** Hàng đang chờ Admin quyết — chỉ có tối đa một, vì nộp lại khi đang chờ bị chặn ở service. */
    Optional<FarmerApplicationHistory> findFirstByUserIdOrderByAttemptDesc(Long userId);

    long countByUserId(Long userId);
}
