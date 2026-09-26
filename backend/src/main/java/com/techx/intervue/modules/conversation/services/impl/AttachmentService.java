package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
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
import java.nio.file.Path;
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
     * Một thư mục phẳng dưới CHAT_UPLOAD_DIR; tên file là UUID nên không đụng nhau. Public vì
     * ChatAttachmentCleanupJob (package khác) xoá file trong đúng thư mục này.
     */
    public static final String FOLDER = "images";

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final ChatRateLimiterInterface rateLimiter;
    private final long maxBytes;
    private final MessageRepository messages;
    private final ConversationLookup lookup;
    private final MessageReportRepository reports;

    public AttachmentService(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            ChatRateLimiterInterface rateLimiter,
            @Value("${app.chat.max-upload-bytes}") long maxBytes,
            MessageRepository messages,
            ConversationLookup lookup,
            MessageReportRepository reports) {
        this.attachments = attachments;
        this.storage = storage;
        this.rateLimiter = rateLimiter;
        this.maxBytes = maxBytes;
        this.messages = messages;
        this.lookup = lookup;
        this.reports = reports;
    }

    @Override
    @Transactional
    public AttachmentResource upload(Long meId, MultipartFile file) {
        byte[] bytes = readWithinLimit(file);
        ImageProbe.Probed probed = ImageProbe.probe(bytes);
        // Hạn mức đếm ảnh ĐÃ NHẬN, không đếm lần thử: máy iPhone gửi HEIC bị 415 mười lần thì
        // không được mất quyền gửi ảnh cả tiếng. Kiểm định ở trên đều rẻ và chưa chạm đĩa.
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.IMAGE);
        byte[] stored = ImageProbe.normalize(bytes, probed.mime());
        // WebP giữ nguyên; JPEG/PNG đã được mã hoá lại thành JPEG nên mime lưu xuống theo file thật
        String mime = ImageProbe.WEBP.equals(probed.mime()) ? ImageProbe.WEBP : ImageProbe.JPEG;
        String storageKey = UUID.randomUUID().toString().toLowerCase(Locale.ROOT) + extension(mime);

        storage.store(FOLDER, storageKey, stored);
        MessageAttachment saved =
                attachments.save(
                        MessageAttachment.builder()
                                .uploaderId(meId)
                                .storageKey(storageKey)
                                .mime(mime)
                                .sizeBytes(stored.length)
                                .width(probed.width())
                                .height(probed.height())
                                .build());
        return AttachmentResource.of(saved.getId(), saved.getWidth(), saved.getHeight());
    }

    @Override
    @Transactional(readOnly = true)
    public StoredFile read(Long meId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));

        if (attachment.getMessageId() == null) {
            // Chưa gắn vào tin nào: chỉ người vừa upload được xem, để hiện preview trước khi gửi
            if (!attachment.getUploaderId().equals(meId)) {
                throw new ConversationAccessDeniedException();
            }
        } else {
            Message message =
                    messages.findById(attachment.getMessageId())
                            .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
            // Tin bị admin ẩn thì ảnh biến mất theo, y như tin biến mất khỏi danh sách
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
            // Ảnh chưa gắn tin nào thì chưa ai báo cáo được; không có việc gì cho admin ở đây
            throw new ModerationOutOfScopeException();
        }
        Message message =
                messages.findById(attachment.getMessageId())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        // Spec §8.3: quyền của admin bắt nguồn từ báo cáo. Ảnh của ±5 tin ngữ cảnh KHÔNG mở ra —
        // ngữ cảnh là để hiểu bối cảnh, không phải đối tượng bị tố.
        if (!reports.existsByMessageId(message.getId())) {
            throw new ModerationOutOfScopeException();
        }
        // Khác người dùng thường: tin bị ẩn KHÔNG chặn admin — họ phải xem lại được quyết định của
        // chính mình.

        Path file =
                storage.find(FOLDER, attachment.getStorageKey())
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        // Mọi lần admin mở một bức ảnh riêng tư đều để lại dấu vết
        log.info(
                "Admin {} opened photo {} on reported message {}",
                adminId,
                attachmentId,
                message.getId());
        return new StoredFile(
                new FileSystemResource(file), attachment.getMime(), attachment.getSizeBytes());
    }

    private byte[] readWithinLimit(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new UnsupportedImageTypeException();
        }
        if (file.getSize() > maxBytes) {
            throw new AttachmentTooLargeException(maxBytes);
        }
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UnsupportedImageTypeException();
        }
    }

    private static String extension(String mime) {
        return ImageProbe.WEBP.equals(mime) ? ".webp" : ".jpg";
    }
}
