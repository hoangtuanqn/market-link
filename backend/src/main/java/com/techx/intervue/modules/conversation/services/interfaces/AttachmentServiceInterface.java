package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.resources.StreamUrlResource;
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

    /**
     * FR-115 §5: a short-lived signed link to play a video. The same rules as {@link #read} (or
     * {@link #readAsAdmin} when {@code admin}) decide whether the link is given; an admin's link is
     * logged here, once.
     */
    StreamUrlResource streamUrl(Long meId, boolean admin, Long attachmentId);

    /**
     * FR-115 §5: the file behind a signed link. The signature and expiry are checked first, then
     * the rights of the user the link was issued to — again on every request, so a message hidden
     * after the link was issued stops playing.
     */
    StoredFile stream(Long attachmentId, long userId, char scope, long exp, String signature);

    record StoredFile(Resource body, String mime, long sizeBytes) {}
}
