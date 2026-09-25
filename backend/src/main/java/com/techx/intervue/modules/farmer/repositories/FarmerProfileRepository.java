package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerProfileRepository extends JpaRepository<FarmerProfile, Long> {
    Optional<FarmerProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    Page<FarmerProfile> findByApprovalStatus(ApprovalStatus approvalStatus, Pageable pageable);

    /**
     * FR-115: tài khoản role farmer mà không có hàng nào ở đây là dữ liệu mâu thuẫn — FarmerService
     * chỉ đặt role = FARMER lúc approve, nên chỉ seed sai hoặc sửa DB tay mới tạo ra được.
     * StallAccessPolicy fail-closed với những tài khoản đó (spec §8.1), và hỏng theo kiểu im lặng,
     * nên ChatStallConsistencyCheck đếm chúng lúc khởi động.
     */
    @Query(
            "select count(u) from User u"
                    + " where u.role = com.techx.intervue.modules.user.enums.RoleType.FARMER"
                    + " and not exists (select 1 from FarmerProfile p where p.userId = u.id)")
    long countFarmersWithoutAProfile();
}
