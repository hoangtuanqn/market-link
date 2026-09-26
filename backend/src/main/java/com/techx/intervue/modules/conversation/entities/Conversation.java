package com.techx.intervue.modules.conversation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

/**
 * FR-110: one thread per pair of users. Always keep userAId < userBId so (3,7) and (7,3) are the
 * same row; who is the "stall" in a thread is decided at display time, by the other party's role.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "conversations")
/*
 * DynamicUpdate: A sends a message while B marks it read. Without it, A's UPDATE rewrites every column
 * from the old snapshot and erases the read marker B just committed (review finding #1). With it, each side only writes the columns it changed.
 */
@DynamicUpdate
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_a_id", nullable = false, updatable = false)
    private Long userAId;

    @Column(name = "user_b_id", nullable = false, updatable = false)
    private Long userBId;

    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @Column(name = "last_message_text", length = 160)
    private String lastMessageText;

    @Column(name = "user_a_read_at")
    private Instant userAReadAt;

    @Column(name = "user_b_read_at")
    private Instant userBReadAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    /**
     * Do not overwrite when a value already exists: integration tests need to set exact timestamps.
     */
    @PrePersist
    protected void onCreated() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    /**
     * The pair is already normalized in order; two identical ids is a programming error, not a user
     * error.
     */
    public static Conversation between(Long x, Long y) {
        if (x.equals(y)) {
            throw new IllegalArgumentException("A conversation needs two different users.");
        }
        return Conversation.builder().userAId(Math.min(x, y)).userBId(Math.max(x, y)).build();
    }

    public boolean hasMember(Long userId) {
        return userId != null && (userId.equals(userAId) || userId.equals(userBId));
    }

    public Long otherMember(Long userId) {
        return userId.equals(userAId) ? userBId : userAId;
    }

    public Instant readAtOf(Long userId) {
        return userId.equals(userAId) ? userAReadAt : userBReadAt;
    }

    public void markRead(Long userId, Instant at) {
        if (userId.equals(userAId)) {
            userAReadAt = at;
        } else {
            userBReadAt = at;
        }
    }

    public void noteNewMessage(String preview, Instant at) {
        lastMessageText = preview;
        lastMessageAt = at;
    }
}
