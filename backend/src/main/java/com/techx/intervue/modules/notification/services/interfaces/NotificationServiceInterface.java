package com.techx.intervue.modules.notification.services.interfaces;

import com.techx.intervue.modules.notification.resources.NotificationEvent;
import java.util.Collection;

public interface NotificationServiceInterface {

    /**
     * Lưu (nếu kind cần lưu, text dịch theo ngôn ngữ từng người) rồi đẩy sau commit. Gọi trong
     * transaction của người gọi để dòng notifications cùng commit với thay đổi gây ra nó.
     */
    void dispatch(Collection<Long> recipients, NotificationEvent event);

    /** dispatch tới mọi admin đang active. */
    void notifyAdmins(NotificationEvent event);
}
