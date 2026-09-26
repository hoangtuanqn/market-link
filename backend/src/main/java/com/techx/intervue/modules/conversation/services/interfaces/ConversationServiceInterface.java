package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;

public interface ConversationServiceInterface {

    /** FR-110: idempotent — if the pair already has a thread, return that thread. */
    ConversationResource open(Long meId, OpenConversationRequest request);

    /** Own threads, newest first. page starts at 1. */
    PagedResource<ConversationResource> listMine(Long meId, int page, int size);

    /** FR-113: total unread for the header badge. */
    UnreadCountResource unreadCount(Long meId);

    /** Mark as read up to now; members only. */
    void markRead(Long meId, Long conversationId);
}
