package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import com.techx.intervue.modules.conversation.resources.StreamUrlResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentServiceInterface {

    AttachmentResource upload(Long meId, MultipartFile file);

    StoredFile read(Long meId, Long attachmentId);

    StoredFile readAsAdmin(Long adminId, Long attachmentId);

    StreamUrlResource streamUrl(Long meId, boolean admin, Long attachmentId);

    StoredFile stream(Long attachmentId, long userId, char scope, long exp, String signature);

    record StoredFile(Resource body, String mime, long sizeBytes) {}
}
