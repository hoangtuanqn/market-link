package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;

public interface ConversationServiceInterface {

    ConversationResource open(Long meId, OpenConversationRequest request);

    PagedResource<ConversationResource> listMine(Long meId, int page, int size);

    UnreadCountResource unreadCount(Long meId);

    void markRead(Long meId, Long conversationId);
}
