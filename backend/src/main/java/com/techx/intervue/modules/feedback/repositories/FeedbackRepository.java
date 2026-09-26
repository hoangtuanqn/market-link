package com.techx.intervue.modules.feedback.repositories;

import com.techx.intervue.modules.feedback.entities.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {}
