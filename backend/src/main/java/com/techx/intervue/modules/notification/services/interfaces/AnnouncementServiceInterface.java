package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.resources.PageResource;
import java.util.Optional;

public interface AnnouncementServiceInterface {

    /** Create and send immediately to every active user in the audience. */
    AnnouncementResource create(Long adminId, AnnouncementRequest request);

    PageResource<AnnouncementResource> list(int page, int size);

    /** Edit the banner; does not edit notifications already sent. */
    AnnouncementResource update(Long id, AnnouncementRequest request);

    /** Remove the banner; notifications already sent are kept. */
    void deactivate(Long id);

    /**
     * The latest banner currently in effect whose audience the viewer belongs to.
     *
     * @param viewer role of the person viewing; null = guest
     */
    Optional<AnnouncementResource> live(RoleType viewer);
}
