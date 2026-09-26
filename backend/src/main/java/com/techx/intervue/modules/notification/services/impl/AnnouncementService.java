package com.techx.intervue.modules.notification.services.impl;

import com.techx.intervue.modules.notification.entities.Announcement;
import com.techx.intervue.modules.notification.enums.Audience;
import com.techx.intervue.modules.notification.exceptions.InvalidAnnouncementException;
import com.techx.intervue.modules.notification.repositories.AnnouncementRepository;
import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.notification.services.interfaces.AnnouncementServiceInterface;
import com.techx.intervue.modules.notification.services.interfaces.NotificationServiceInterface;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.resources.PageResource;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** FR-077 — an admin posts a platform-wide announcement; also the source of the public banner. */
@Service
@RequiredArgsConstructor
public class AnnouncementService implements AnnouncementServiceInterface {

    private final AnnouncementRepository announcements;
    private final NotificationServiceInterface notifications;
    private final Clock clock;

    @Override
    @Transactional
    public AnnouncementResource create(Long adminId, AnnouncementRequest request) {
        checkWindow(request);
        Announcement a =
                announcements.save(
                        Announcement.builder()
                                .title(request.title().strip())
                                .content(request.content().strip())
                                .audience(request.audience())
                                .createdBy(adminId)
                                .startsAt(request.startsAt())
                                .endsAt(request.endsAt())
                                .build());
        notifications.broadcastAnnouncement(a);
        return AnnouncementResource.from(a);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResource<AnnouncementResource> list(int page, int size) {
        Page<Announcement> result =
                announcements.findAllByOrderByCreatedAtDescIdDesc(PageRequest.of(page - 1, size));
        return PageResource.<AnnouncementResource>builder()
                .items(result.map(AnnouncementResource::from).getContent())
                .page(page)
                .pageSize(size)
                .total(result.getTotalElements())
                .build();
    }

    @Override
    @Transactional
    public AnnouncementResource update(Long id, AnnouncementRequest request) {
        checkWindow(request);
        Announcement a = find(id);
        a.setTitle(request.title().strip());
        a.setContent(request.content().strip());
        a.setAudience(request.audience());
        a.setStartsAt(request.startsAt());
        a.setEndsAt(request.endsAt());
        return AnnouncementResource.from(a);
    }

    @Override
    @Transactional
    public void deactivate(Long id) {
        find(id).setActive(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AnnouncementResource> live(RoleType viewer) {
        return announcements
                .findLive(clock.instant(), Audience.visibleTo(viewer), PageRequest.of(0, 1))
                .stream()
                .findFirst()
                .map(AnnouncementResource::from);
    }

    private Announcement find(Long id) {
        return announcements
                .findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Announcement not found."));
    }

    private static void checkWindow(AnnouncementRequest r) {
        if (r.startsAt() != null && r.endsAt() != null && !r.endsAt().isAfter(r.startsAt())) {
            throw new InvalidAnnouncementException("The end time must be after the start time.");
        }
    }
}
