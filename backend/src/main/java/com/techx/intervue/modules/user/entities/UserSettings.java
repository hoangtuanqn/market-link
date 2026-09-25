package com.techx.intervue.modules.user.entities;

import com.techx.intervue.converters.StringMapJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tuỳ chọn hiển thị của một tài khoản; giá trị hợp lệ nằm ở UpdateSettingsRequest. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_settings")
public class UserSettings {
    @Id
    @Column(name = "user_id")
    private Long userId;

    private String theme;
    private String language;
    private String currency;
    private String units;

    @Column(name = "date_format")
    private String dateFormat;

    private String clock;

    @Column(name = "preferred_market")
    private String preferredMarket;

    @Convert(converter = StringMapJsonConverter.class)
    @Column(name = "extras_json")
    private Map<String, String> extras;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreated() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdated() {
        updatedAt = Instant.now();
    }
}
