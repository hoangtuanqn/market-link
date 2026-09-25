package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.util.List;

public interface MessageServiceInterface {

    /** FR-110: chỉ thành viên; kiểm chính sách gửi; cập nhật preview thread; phát sự kiện. */
    MessageResource send(Long meId, Long conversationId, SendMessageRequest request);

    /** Mới nhất trước; before = id của tin cũ nhất đang có để cuộn lên; size kẹp về 1..50. */
    List<MessageResource> list(Long meId, Long conversationId, Long before, int size);
}
