package com.techx.intervue.modules.notification.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Âm thanh và giờ yên tĩnh (HH:mm, giờ Asia/Ho_Chi_Minh) của một người. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Table(name = "notification_settings")
public class NotificationSettings {
    @Id
    @Column(name = "user_id")
    private Long userId;

    private boolean sound;

    @Column(name = "quiet_on")
    private boolean quietOn;

    @Column(name = "quiet_from")
    private String quietFrom;

    @Column(name = "quiet_to")
    private String quietTo;

    public static NotificationSettings defaults(Long userId) {
        return new NotificationSettings(userId, true, false, "22:00", "07:00");
    }
}
