package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    /** Attach images to a page's message list, no N+1. ids must not be empty. */
    List<MessageAttachment> findByMessageIdIn(Collection<Long> messageIds);

    /** An image uploaded and then abandoned — ChatAttachmentCleanupJob cleans it (spec §8.2). */
    List<MessageAttachment> findByMessageIdIsNullAndCreatedAtBefore(Instant cutoff);
}
