package com.techx.intervue.modules.notification.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One category × two channels for one person. No row = both channels on. category keeps the string
 * code (NotificationCategory.code()) because JPA does not apply a converter to an @Id attribute.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notification_preferences")
@IdClass(NotificationPreference.Key.class)
public class NotificationPreference {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id private String category;

    @Column(name = "in_app")
    private boolean inApp;

    private boolean browser;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Key implements Serializable {
        private Long userId;
        private String category;
    }
}
