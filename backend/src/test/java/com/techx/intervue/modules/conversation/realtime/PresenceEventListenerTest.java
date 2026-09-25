package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.realtime.PresenceEventListener.PresenceEvent;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

class PresenceEventListenerTest {

    PresenceService presence;
    ConversationRepository conversations;
    StompChatEventPublisher publisher;
    PresenceEventListener listener;
    Principal me = () -> "7";

    @BeforeEach
    void setUp() {
        presence = mock(PresenceService.class);
        conversations = mock(ConversationRepository.class);
        publisher = mock(StompChatEventPublisher.class);
        listener = new PresenceEventListener(presence, conversations, publisher);
        when(conversations.findOtherMemberIds(7L)).thenReturn(List.of(3L, 5L));
    }

    private SessionConnectedEvent connected(String sessionId) {
        StompHeaderAccessor a = StompHeaderAccessor.create(StompCommand.CONNECTED);
        a.setSessionId(sessionId);
        a.setUser(me);
        return new SessionConnectedEvent(
                this, MessageBuilder.createMessage(new byte[0], a.getMessageHeaders()), me);
    }

    private SessionDisconnectEvent disconnected(String sessionId, Principal user) {
        return new SessionDisconnectEvent(
                this,
                MessageBuilder.withPayload(new byte[0]).build(),
                sessionId,
                CloseStatus.NORMAL,
                user);
    }

    @Test
    void goingOnlineTellsEveryoneYouHaveTalkedTo() {
        when(presence.connected(7L, "s1")).thenReturn(true);

        listener.onConnected(connected("s1"));

        verify(publisher)
                .send(3L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, true, null));
        verify(publisher)
                .send(5L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, true, null));
    }

    @Test
    void aSecondTabIsSilent() {
        when(presence.connected(7L, "s2")).thenReturn(false);

        listener.onConnected(connected("s2"));

        verify(publisher, never()).send(anyLong(), anyString(), any());
    }

    @Test
    void goingOfflineSendsLastSeen() {
        when(presence.disconnected(7L, "s1")).thenReturn(true);
        Instant at = Instant.parse("2026-09-25T06:00:00Z");
        when(presence.lastSeen(7L)).thenReturn(at);

        listener.onDisconnected(disconnected("s1", me));

        verify(publisher)
                .send(3L, StompChatEventPublisher.PRESENCE, new PresenceEvent(7L, false, at));
    }

    @Test
    void disconnectWithoutPrincipalIsIgnored() {
        listener.onDisconnected(disconnected("s1", null));

        verify(presence, never()).disconnected(anyLong(), anyString());
    }
}
