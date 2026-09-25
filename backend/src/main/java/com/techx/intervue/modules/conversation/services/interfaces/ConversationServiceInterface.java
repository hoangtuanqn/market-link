package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;

public interface ConversationServiceInterface {

    /** FR-110: idempotent — cặp đã có thread thì trả lại thread đó. */
    ConversationResource open(Long meId, OpenConversationRequest request);

    /** Thread của chính mình, mới nhất trước. page bắt đầu từ 1. */
    PagedResource<ConversationResource> listMine(Long meId, int page, int size);

    /** FR-113: tổng chưa đọc cho badge header. */
    UnreadCountResource unreadCount(Long meId);

    /** Đánh dấu đã đọc tới hiện tại; chỉ thành viên. */
    void markRead(Long meId, Long conversationId);
}
