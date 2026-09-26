package com.techx.intervue.modules.notification.repositories;

import com.techx.intervue.modules.notification.entities.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, Long> {}
