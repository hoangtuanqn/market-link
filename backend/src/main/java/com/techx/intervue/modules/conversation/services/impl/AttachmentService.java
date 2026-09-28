package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentNotYoursException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.ModerationOutOfScopeException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageReportRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import jakarta.persistence.EntityNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** FR-115, spec §8.2. */
@Slf4j
@Service
public class AttachmentService implements AttachmentServiceInterface {

    /**
     * A flat directory under CHAT_UPLOAD_DIR; file names are UUIDs so they never collide. Public
     * because ChatAttachmentCleanupJob (a different package) deletes files in this same directory.
     */
    public static final String FOLDER = "images";

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final ChatRateLimiterInterface rateLimiter;
    private final long maxBytes;
    private final MessageRepository messages;
    private final ConversationLookup lookup;
    private final MessageReportRepository reports;
    private final Path tempDir;

    public AttachmentService(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            ChatRateLimiterInterface rateLimiter,
            @Value("${app.chat.max-upload-bytes}") long maxBytes,
            MessageRepository messages,
            ConversationLookup lookup,
            MessageReportRepository reports,
            @Value("${app.chat.temp-dir}") String tempDir) {
        this.attachments = attachments;
        this.storage = storage;
        this.rateLimiter = rateLimiter;
        this.maxBytes = maxBytes;
        this.messages = messages;
        this.lookup = lookup;
        this.reports = reports;
        this.tempDir = Paths.get(tempDir);
    }

    /**
     * FR-115: the upload is copied to a temp file and recognised from its bytes (MediaProbe). JPEG/
     * PNG are re-encoded (EXIF goes, big photos are scaled to 4096 px); WebP, GIF, AVIF and videos
     * are copied as uploaded. Nothing larger than a photo is ever held in memory.
     */
    @Override
    @Transactional
    public AttachmentResource upload(Long meId, MultipartFile file) {
        requireWithinLimit(file);
        Path temp = copyToTemp(file);
        try {
            MediaProbe.Probed probed = MediaProbe.probe(temp);
            // The limit counts files ACCEPTED, not attempts: an iPhone sending HEIC that gets 415
            // ten times must not lose the right to send photos for a whole hour. The checks above
            // are all cheap and have not touched the store yet.
            rateLimiter.check(meId, ChatRateLimiterInterface.Action.IMAGE);
            MessageAttachment.MessageAttachmentBuilder record =
                    MessageAttachment.builder().uploaderId(meId);
            if (probed.handling() == MediaProbe.Handling.REENCODE) {
                byte[] stored = ImageProbe.normalize(Files.readAllBytes(temp), probed.mime());
                String storageKey = newStorageKey(ImageProbe.JPEG);
                storage.store(FOLDER, storageKey, stored);
                int[] size = ImageProbe.storedSize(probed.width(), probed.height());
                record.storageKey(storageKey)
                        .mime(ImageProbe.JPEG)
                        .sizeBytes(stored.length)
                        .width(size[0])
                        .height(size[1]);
            } else {
                String storageKey = newStorageKey(probed.mime());
                storage.storeFile(FOLDER, storageKey, temp);
                record.storageKey(storageKey)
                        .mime(probed.mime())
                        .sizeBytes((int) Files.size(temp))
                        .width(probed.width())
                        .height(probed.height());
            }
            MessageAttachment saved = attachments.save(record.build());
            return AttachmentResource.of(
                    saved.getId(), saved.getMime(), saved.getWidth(), saved.getHeight());
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        } finally {
            deleteQuietly(temp);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFile read(Long meId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));

        if (attachment.getMessageId() == null) {
            // Not yet attached to any message: only the person who just uploaded may view it, to
            // show a preview before sending.
            // Same code as attaching someone else's image to your own message — same idea, one
            // code.
            if (!attachment.getUploaderId().equals(meId)) {
                throw new AttachmentNotYoursException();
            }
        } else {
            Message message =
                    messages.findById(attachment.getMessageId())
                            .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
            // When an admin hides a message the image disappears with it, just as the message
            // disappears from the list
            if (message.isHidden()) {
                throw new EntityNotFoundException("Photo not found.");
            }
            lookup.requireMember(meId, message.getConversationId());
        }

        Path file =
                storage.find(FOLDER, attachment.getStorageKey())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        return new StoredFile(
                new FileSystemResource(file), attachment.getMime(), attachment.getSizeBytes());
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFile readAsAdmin(Long adminId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        if (attachment.getMessageId() == null) {
            // An image not attached to any message cannot be reported yet; there is nothing for an
            // admin to do here
            throw new ModerationOutOfScopeException();
        }
        Message message =
                messages.findById(attachment.getMessageId())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        // Spec §8.3: an admin's rights come from a report. The images of the ±5 context messages do
        // NOT open up —
        // context is for understanding the situation, it is not the reported subject.
        if (!reports.existsByMessageId(message.getId())) {
            throw new ModerationOutOfScopeException();
        }
        // Unlike ordinary users: a hidden message does NOT block an admin — they must be able to
        // re-check
        // their own decision.

        Path file =
                storage.find(FOLDER, attachment.getStorageKey())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        // Every time an admin opens a private photo it leaves a trace
        log.info(
                "Admin {} opened photo {} on reported message {}",
                adminId,
                attachmentId,
                message.getId());
        return new StoredFile(
                new FileSystemResource(file), attachment.getMime(), attachment.getSizeBytes());
    }

    private void requireWithinLimit(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new UnsupportedImageTypeException();
        }
        if (file.getSize() > maxBytes) {
            throw new AttachmentTooLargeException(maxBytes);
        }
    }

    private Path copyToTemp(MultipartFile file) {
        try {
            Files.createDirectories(tempDir);
            Path temp = Files.createTempFile(tempDir, "chat-upload-", ".part");
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, temp, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                deleteQuietly(temp);
                throw e;
            }
            return temp;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read the upload", e);
        }
    }

    private static void deleteQuietly(Path temp) {
        try {
            Files.deleteIfExists(temp);
        } catch (IOException e) {
            log.warn("Could not delete the upload temp file {}", temp, e);
        }
    }

    private static String newStorageKey(String mime) {
        return UUID.randomUUID().toString().toLowerCase(Locale.ROOT) + MediaProbe.extension(mime);
    }
}
