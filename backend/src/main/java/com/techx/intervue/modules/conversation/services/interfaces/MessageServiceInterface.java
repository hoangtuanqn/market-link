package com.techx.intervue.modules.conversation.services.interfaces;

import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import java.util.List;

public interface MessageServiceInterface {

    MessageResource send(Long meId, Long conversationId, SendMessageRequest request);

    List<MessageResource> list(Long meId, Long conversationId, Long before, int size);
}
