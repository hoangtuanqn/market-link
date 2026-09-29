package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    List<MessageAttachment> findByMessageIdIn(Collection<Long> messageIds);

    List<MessageAttachment> findByMessageIdIsNullAndCreatedAtBefore(Instant cutoff);
}
