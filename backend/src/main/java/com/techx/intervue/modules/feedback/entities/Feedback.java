package com.techx.intervue.modules.feedback.entities;

import com.techx.intervue.modules.feedback.enums.FeedbackStatus;
import com.techx.intervue.modules.feedback.enums.FeedbackType;
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

/** One submission of the feedback form (table {@code feedbacks}, V20260926021). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "feedbacks")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** NULL for a visitor who was not signed in. */
    @Column(name = "user_id")
    private Long userId;

    @Convert(converter = FeedbackType.DbConverter.class)
    @Column(nullable = false)
    private FeedbackType type;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Convert(converter = FeedbackStatus.DbConverter.class)
    @Column(nullable = false)
    private FeedbackStatus status = FeedbackStatus.NEW;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
