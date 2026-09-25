package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** R-06: mọi endpoint có {id} đi qua đây trước khi trả bất cứ thứ gì. */
@Component
@RequiredArgsConstructor
public class ConversationLookup {

    private final ConversationRepository conversations;

    public Conversation requireMember(Long meId, Long conversationId) {
        Conversation conversation =
                conversations
                        .findById(conversationId)
                        .orElseThrow(() -> new EntityNotFoundException("Conversation not found."));
        if (!conversation.hasMember(meId)) {
            throw new ConversationAccessDeniedException();
        }
        return conversation;
    }
}
