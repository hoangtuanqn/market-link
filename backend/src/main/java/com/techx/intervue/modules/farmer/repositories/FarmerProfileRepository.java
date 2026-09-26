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
     * The stall profiles of several people at once (the chat thread list); whoever is not a Farmer
     * has none.
     */
    List<FarmerProfile> findAllByUserIdIn(Collection<Long> userIds);

    boolean existsByUserId(Long userId);

    /**
     * §6.1 + docs/prototype/admin/farmers.html (the "Stall, contact person, phone" box). One join
     * statement instead of "fetch a page of profiles then look up the user for each row" — the old
     * way is N+1 queries per page.
     *
     * <p>A null {@code status} or {@code q} means no filtering by that criterion. {@code q} must be
     * an already-lowercased LIKE pattern (see FarmerService), because the SQL compares lowercased
     * strings.
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
     * FR-115: an account with the farmer role and no row here is inconsistent data — FarmerService
     * only sets role = FARMER on approve, so only a wrong seed or a manual DB edit can produce it.
     * StallAccessPolicy fails closed for such accounts (spec §8.1), and it breaks silently, so
     * ChatStallConsistencyCheck counts them at startup.
     */
    @Query(
            "select count(u) from User u"
                    + " where u.role = com.techx.intervue.modules.user.enums.RoleType.FARMER"
                    + " and not exists (select 1 from FarmerProfile p where p.userId = u.id)")
    long countFarmersWithoutAProfile();
}
