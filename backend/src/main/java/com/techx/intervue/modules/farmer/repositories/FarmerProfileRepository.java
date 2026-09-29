package com.techx.intervue.modules.farmer.repositories;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource;
import java.time.Instant;
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

    List<FarmerProfile> findAllByUserIdIn(Collection<Long> userIds);

    boolean existsByUserId(Long userId);

    List<FarmerProfile> findByApprovalStatusAndSuspendedUntilLessThanEqual(
            ApprovalStatus status, Instant now);

    @Query(
            value =
                    "select new com.techx.intervue.modules.farmer.resources.AdminFarmerListItemResource("
                            + "p.id, p.stallName, p.contactPerson, u.email, u.phone, p.approvalStatus,"
                            + " p.createdAt, u.image)"
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

    @Query(
            "select count(u) from User u"
                    + " where u.role = com.techx.intervue.modules.user.enums.RoleType.FARMER"
                    + " and not exists (select 1 from FarmerProfile p where p.userId = u.id)")
    long countFarmersWithoutAProfile();
}
