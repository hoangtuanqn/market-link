package com.techx.intervue.modules.conversation.entities;

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

/** FR-112: mốc hoạt động cuối, ghi khi ngắt kết nối (PresenceService). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "user_presence")
public class UserPresence {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;
}
