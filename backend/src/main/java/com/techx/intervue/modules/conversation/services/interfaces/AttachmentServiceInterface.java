package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentServiceInterface {

    /**
     * Upload an image, not yet attached to any message. Attaching happens when the message is sent
     * (MessageService).
     */
    AttachmentResource upload(Long meId, MultipartFile file);

    /** Spec §8.2: files only leave through here, after checking membership. */
    StoredFile read(Long meId, Long attachmentId);

    /**
     * Spec §8.3 + LEAD decision 26/09: an admin can view the image of a message that HAS been
     * reported, and only that message — not the images of the ±5 context messages. It does not go
     * through the membership check because an admin is not a member; this is a separate, narrower
     * path, and it is logged.
     */
    StoredFile readAsAdmin(Long adminId, Long attachmentId);

    record StoredFile(Resource body, String mime, long sizeBytes) {}
}
