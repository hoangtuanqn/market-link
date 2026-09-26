package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.requests.AnnouncementRequest;
import com.techx.intervue.modules.notification.resources.AnnouncementResource;
import com.techx.intervue.resources.PageResource;
import java.util.Optional;

public interface AnnouncementServiceInterface {

    /** Tạo và gửi ngay cho mọi user active thuộc audience. */
    AnnouncementResource create(Long adminId, AnnouncementRequest request);

    PageResource<AnnouncementResource> list(int page, int size);

    /** Sửa banner; không sửa các thông báo đã gửi. */
    AnnouncementResource update(Long id, AnnouncementRequest request);

    /** Gỡ banner; thông báo đã gửi vẫn giữ. */
    void deactivate(Long id);

    /** Banner đang hiệu lực mới nhất cho trang public. */
    Optional<AnnouncementResource> live();
}
