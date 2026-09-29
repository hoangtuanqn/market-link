package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.resources.PageResource;
import java.util.Optional;

public interface AnnouncementServiceInterface {

    AnnouncementResource create(Long adminId, AnnouncementRequest request);

    PageResource<AnnouncementResource> list(int page, int size);

    AnnouncementResource update(Long id, AnnouncementRequest request);

    void deactivate(Long id);

    Optional<AnnouncementResource> live(RoleType viewer);
}
