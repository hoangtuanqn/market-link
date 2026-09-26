package com.techx.intervue.modules.conversation;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.services.impl.AttachmentService;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec §8.2: if a user picks an image and then changes their mind, the file stays on the volume
 * forever. Once an hour it sweeps, deleting images not attached to any message and older than 24
 * hours. @EnableScheduling is already on in AppConfig.
 */
@Slf4j
@Component
public class ChatAttachmentCleanupJob {

    static final Duration KEEP_ORPHANS_FOR = Duration.ofHours(24);

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final Clock clock;

    public ChatAttachmentCleanupJob(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            Clock clock) {
        this.attachments = attachments;
        this.storage = storage;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT10M")
    @Transactional
    public void run() {
        List<MessageAttachment> orphans =
                attachments.findByMessageIdIsNullAndCreatedAtBefore(
                        clock.instant().minus(KEEP_ORPHANS_FOR));
        if (orphans.isEmpty()) {
            return;
        }
        for (MessageAttachment orphan : orphans) {
            try {
                storage.delete(AttachmentService.FOLDER, orphan.getStorageKey());
            } catch (RuntimeException e) {
                // One bad file must not hold back the whole batch; the DB row is still deleted, a
                // leftover file only costs space
                log.warn(
                        "Could not delete orphan chat photo {}: {}",
                        orphan.getStorageKey(),
                        e.getMessage());
            }
        }
        attachments.deleteAll(orphans);
        log.info("Cleaned up {} chat photos that were never sent", orphans.size());
    }
}
