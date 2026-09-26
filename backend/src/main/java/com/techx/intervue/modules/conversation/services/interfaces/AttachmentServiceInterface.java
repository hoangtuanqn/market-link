package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.resources.AttachmentResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface AttachmentServiceInterface {

    /** Tải ảnh lên, chưa gắn vào tin nào. Gắn xảy ra lúc gửi tin (MessageService). */
    AttachmentResource upload(Long meId, MultipartFile file);

    /** Spec §8.2: file chỉ ra ngoài qua đây, sau khi kiểm tư cách thành viên. */
    StoredFile read(Long meId, Long attachmentId);

    /**
     * Spec §8.3 + quyết định LEAD 26/09: admin xem được ảnh của tin ĐÃ bị báo cáo, và chỉ tin đó —
     * không phải ảnh của ±5 tin ngữ cảnh. Không đi qua kiểm tư cách thành viên vì admin không phải
     * thành viên; đây là một con đường riêng, hẹp hơn, và có ghi log.
     */
    StoredFile readAsAdmin(Long adminId, Long attachmentId);

    record StoredFile(Resource body, String mime, long sizeBytes) {}
}
