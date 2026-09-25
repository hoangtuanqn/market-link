package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.services.interfaces.AttachmentServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.services.interfaces.FileStorageServiceInterface;
import java.io.IOException;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/** FR-115, spec §8.2. */
@Service
public class AttachmentService implements AttachmentServiceInterface {

    /** Một thư mục phẳng dưới CHAT_UPLOAD_DIR; tên file là UUID nên không đụng nhau. */
    static final String FOLDER = "images";

    private final MessageAttachmentRepository attachments;
    private final FileStorageServiceInterface storage;
    private final ChatRateLimiterInterface rateLimiter;
    private final long maxBytes;

    public AttachmentService(
            MessageAttachmentRepository attachments,
            @Qualifier("chatFileStorage") FileStorageServiceInterface storage,
            ChatRateLimiterInterface rateLimiter,
            @Value("${app.chat.max-upload-bytes}") long maxBytes) {
        this.attachments = attachments;
        this.storage = storage;
        this.rateLimiter = rateLimiter;
        this.maxBytes = maxBytes;
    }

    @Override
    @Transactional
    public AttachmentResource upload(Long meId, MultipartFile file) {
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.IMAGE);
        byte[] bytes = readWithinLimit(file);
        ImageProbe.Probed probed = ImageProbe.probe(bytes);
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
