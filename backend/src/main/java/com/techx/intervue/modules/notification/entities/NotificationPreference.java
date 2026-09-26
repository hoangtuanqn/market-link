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
 * Một nhóm × hai kênh của một người. Chưa có dòng = cả hai kênh bật. category giữ code chuỗi
 * (NotificationCategory.code()) vì JPA không áp converter lên thuộc tính @Id.
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
