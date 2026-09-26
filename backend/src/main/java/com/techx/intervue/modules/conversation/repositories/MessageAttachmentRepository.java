package com.techx.intervue.modules.conversation.repositories;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment, Long> {

    /** Gắn ảnh vào danh sách tin của một trang, không N+1. ids không được rỗng. */
    List<MessageAttachment> findByMessageIdIn(Collection<Long> messageIds);

    /** Ảnh upload rồi bỏ đó — ChatAttachmentCleanupJob dọn (spec §8.2). */
    List<MessageAttachment> findByMessageIdIsNullAndCreatedAtBefore(Instant cutoff);
}
