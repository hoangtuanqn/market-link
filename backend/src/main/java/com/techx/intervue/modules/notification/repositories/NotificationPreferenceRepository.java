package com.techx.intervue.modules.notification.repositories;

import com.techx.intervue.modules.notification.entities.NotificationPreference;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceRepository
        extends JpaRepository<NotificationPreference, NotificationPreference.Key> {

    List<NotificationPreference> findByUserId(Long userId);

    Optional<NotificationPreference> findByUserIdAndCategory(Long userId, String category);
}
