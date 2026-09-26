package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerProfileRepository extends JpaRepository<FarmerProfile, Long> {
    Optional<FarmerProfile> findByUserId(Long userId);

    /**
     * Hồ sơ stall của nhiều người một lần (danh sách thread chat); ai không phải Farmer thì không
     * có.
     */
    List<FarmerProfile> findAllByUserIdIn(Collection<Long> userIds);

    boolean existsByUserId(Long userId);

    /**
     * §6.1 + docs/prototype/admin/farmers.html (ô "Stall, contact person, phone"). Một câu join
     * thay cho "lấy trang hồ sơ rồi tìm user cho từng dòng" — cách cũ là N+1 query cho mỗi trang.
     *
     * <p>{@code status} hoặc {@code q} null nghĩa là không lọc theo tiêu chí đó. {@code q} phải là
     * mẫu LIKE đã viết thường sẵn (xem FarmerService), vì SQL so sánh chuỗi đã hạ chữ.
     */
    @Query(
            value =
                    "select new com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource("
                            + "p.id, p.stallName, p.contactPerson, u.email, u.phone, p.approvalStatus,"
                            + " p.createdAt)"
                            + " from FarmerProfile p join User u on u.id = p.userId"
                            + " where (:status is null or p.approvalStatus = :status)"
                            + " and (:q is null or lower(p.stallName) like :q"
                            + " or lower(p.contactPerson) like :q or lower(u.email) like :q"
                            + " or u.phone like :q)"
                            + " order by p.createdAt desc",
            countQuery =
                    "select count(p) from FarmerProfile p join User u on u.id = p.userId"
                            + " where (:status is null or p.approvalStatus = :status)"
                            + " and (:q is null or lower(p.stallName) like :q"
                            + " or lower(p.contactPerson) like :q or lower(u.email) like :q"
                            + " or u.phone like :q)")
    Page<AdminFarmerListItemResource> search(
            @Param("status") ApprovalStatus status, @Param("q") String q, Pageable pageable);

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
