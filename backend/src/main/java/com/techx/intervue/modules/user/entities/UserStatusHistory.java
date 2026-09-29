package com.techx.intervue.modules.user.entities;

import com.techx.intervue.modules.user.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "user_status_history")
public class UserStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Convert(converter = UserStatus.DbConverter.class)
    @Column(name = "from_status", nullable = false, length = 20)
    private UserStatus fromStatus;

    @Convert(converter = UserStatus.DbConverter.class)
    @Column(name = "to_status", nullable = false, length = 20)
    private UserStatus toStatus;

    @Column(length = 255)
    private String reason;

    private Instant until;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", insertable = false, updatable = false)
    private Instant changedAt;
}
