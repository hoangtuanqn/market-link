package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingEvent;
import com.techx.intervue.modules.conversation.realtime.TypingController.TypingRequest;
import com.techx.intervue.modules.conversation.services.impl.ConversationLookup;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import jakarta.persistence.EntityNotFoundException;
import java.security.Principal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TypingControllerTest {

    ConversationLookup lookup;
    StompChatEventPublisher publisher;
    ChatRateLimiterInterface rateLimiter;
    TypingController controller;
    Principal me = () -> "7";

    @BeforeEach
    void setUp() {
        lookup = mock(ConversationLookup.class);
        publisher = mock(StompChatEventPublisher.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        controller = new TypingController(lookup, publisher, rateLimiter);
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

    /** Review Focus #5: client bug hoặc frame bịa. */
    @Test
    void ignoresAFrameWithNoConversationId() {
        assertThatCode(() -> controller.typing(new TypingRequest(null, true), me))
                .doesNotThrowAnyException();

        verifyNoInteractions(publisher);
        verifyNoInteractions(lookup);
    }

    @Test
    void ignoresAnEmptyFrame() {
        assertThatCode(() -> controller.typing(null, me)).doesNotThrowAnyException();

        verifyNoInteractions(publisher);
        verifyNoInteractions(lookup);
    }

    /** Review Focus #5, nửa sau: rải frame liên tục. */
    @Test
    void dropsTypingFramesOnceTheLimitIsReached() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too fast"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.TYPING);

        assertThatCode(() -> controller.typing(new TypingRequest(42L, true), me))
                .doesNotThrowAnyException();

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }

    /** Vượt hạn mức thì không được chạm DB: chặn spam phải rẻ hơn việc nó gây ra. */
    @Test
    void checksTheLimitBeforeTouchingTheDatabase() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too fast"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.TYPING);

        controller.typing(new TypingRequest(42L, true), me);

        verifyNoInteractions(lookup);
    }

    @Test
    void aFrameWithinTheLimitStillGoesThrough() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(lookup.requireMember(7L, 42L)).thenReturn(c);

        controller.typing(new TypingRequest(42L, false), me);

        verify(rateLimiter).check(7L, ChatRateLimiterInterface.Action.TYPING);
        verify(publisher).send(3L, StompChatEventPublisher.TYPING, new TypingEvent(42L, 7L, false));
    }
}
