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

/**
 * FR-110: một thread cho một cặp người dùng. Luôn giữ userAId < userBId để (3,7) và (7,3) là cùng
 * một dòng; ai là "stall" trong thread được quyết lúc hiển thị, theo vai của người đối diện.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "conversations")
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

    @PrePersist
    protected void onCreated() {
        createdAt = Instant.now();
    }

    /** Cặp đã chuẩn hoá thứ tự; hai id giống nhau là lỗi lập trình, không phải lỗi người dùng. */
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
