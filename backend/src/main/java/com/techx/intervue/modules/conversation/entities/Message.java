package com.techx.intervue.modules.conversation.entities;

import com.techx.intervue.modules.conversation.enums.MessageKind;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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

/** FR-110, FR-114. productId / orderId are pinned context, no FK yet (see the migration). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private Long conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private Long senderId;

    @Convert(converter = MessageKind.DbConverter.class)
    @Column(nullable = false)
    @Builder.Default
    private MessageKind kind = MessageKind.TEXT;

    @Column(length = 2000)
    private String body;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "order_id")
    private Long orderId;

    /** Hidden by an admin (Plan 3). Never hard-deleted. */
    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "hidden_by")
    private Long hiddenBy;

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

    public boolean isHidden() {
        return hiddenAt != null;
    }
}
