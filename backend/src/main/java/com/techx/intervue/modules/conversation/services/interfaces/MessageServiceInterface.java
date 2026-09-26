package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.util.List;

public interface MessageServiceInterface {

    /**
     * FR-110: members only; check the send policy; update the thread preview; publish the event.
     */
    MessageResource send(Long meId, Long conversationId, SendMessageRequest request);

    /**
     * Newest first; before = the id of the oldest message currently held, for scrolling up; size
     * clamped to 1..50.
     */
    List<MessageResource> list(Long meId, Long conversationId, Long before, int size);
}
