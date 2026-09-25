package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingEvent;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingRequest;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
import jakarta.persistence.EntityNotFoundException;
import java.security.Principal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TypingControllerTest {

    ConversationLookup lookup;
    StompChatEventPublisher publisher;
    TypingController controller;
    Principal me = () -> "7";

    @BeforeEach
    void setUp() {
        lookup = mock(ConversationLookup.class);
        publisher = mock(StompChatEventPublisher.class);
        controller = new TypingController(lookup, publisher);
    }

    @Test
    void typingIsForwardedToTheOtherMemberOnly() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(lookup.requireMember(7L, 42L)).thenReturn(c);

        controller.typing(new TypingRequest(42L, true), me);

        verify(publisher).send(3L, StompChatEventPublisher.TYPING, new TypingEvent(42L, 7L, true));
        verify(publisher, times(1)).send(anyLong(), anyString(), any()); // đúng một người nhận
    }

    @Test
    void typingForAForeignThreadIsDropped() {
        when(lookup.requireMember(7L, 42L)).thenThrow(new ConversationAccessDeniedException());

        controller.typing(new TypingRequest(42L, true), me);

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }

    @Test
    void typingForAnUnknownThreadIsDroppedWithoutRevealingAnything() {
        when(lookup.requireMember(7L, 999L)).thenThrow(new EntityNotFoundException("x"));

        controller.typing(new TypingRequest(999L, true), me);

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }
}
