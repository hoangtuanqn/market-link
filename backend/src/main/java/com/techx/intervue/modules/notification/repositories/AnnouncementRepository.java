package com.techx.intervue.modules.notification.repositories;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.enums.Audience;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    Page<Announcement> findAllByOrderByCreatedAtDescIdDesc(Pageable pageable);

    /**
     * Banner public: đang bật, đang trong khung giờ (null = không giới hạn phía đó) và thuộc một
     * trong các audience người xem được thấy.
     */
    @Query(
            """
            select a from Announcement a
            where a.active = true
              and a.audience in :audiences
              and (a.startsAt is null or a.startsAt <= :now)
              and (a.endsAt is null or a.endsAt > :now)
            order by a.createdAt desc, a.id desc""")
    List<Announcement> findLive(
            @Param("now") Instant now,
            @Param("audiences") Collection<Audience> audiences,
            Pageable pageable);
}
