package com.techx.intervue.modules.platform.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "platform_status")
public class PlatformStatus {

    @Id private Integer id;

    @Column(name = "maintenance_mode")
    private boolean maintenanceMode;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
