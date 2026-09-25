package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentServiceInterface {

    /** Tải ảnh lên, chưa gắn vào tin nào. Gắn xảy ra lúc gửi tin (MessageService). */
    AttachmentResource upload(Long meId, MultipartFile file);
}
