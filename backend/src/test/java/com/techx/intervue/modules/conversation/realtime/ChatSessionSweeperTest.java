package com.techx.intervue.modules.conversation.realtime;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.impl.UserSessionCache.SessionData;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

/**
 * Review #5: signing out of every device / a revoked session must close the open socket too, not
 * just block new requests.
 */
class ChatSessionSweeperTest {

    static final Instant IAT = Instant.parse("2026-09-25T06:00:00Z");
    UserSessionCache cache;
    ChatSessionRegistry registry;
    ChatSessionSweeper sweeper;

    @BeforeEach
    void setUp() {
        cache = mock(UserSessionCache.class);
        registry = new ChatSessionRegistry();
        sweeper = new ChatSessionSweeper(registry, cache);
    }

    private WebSocketSession session(String id, Long userId) {
        WebSocketSession s = mock(WebSocketSession.class);
        Map<String, Object> attrs = new HashMap<>();
        attrs.put(StompAuthInterceptor.ATTR_USER_ID, userId);
        attrs.put(StompAuthInterceptor.ATTR_ISSUED_AT, IAT);
        when(s.getId()).thenReturn(id);
        when(s.getAttributes()).thenReturn(attrs);
        when(s.isOpen()).thenReturn(true);
        registry.afterConnectionEstablished(s);
        return s;
    }

    @Test
    void aSocketWhoseSessionWasEvictedIsClosed() throws Exception {
        WebSocketSession gone = session("s1", 7L);
        WebSocketSession fine = session("s2", 9L);
        when(cache.get(7L)).thenReturn(null);
        when(cache.get(9L)).thenReturn(new SessionData("b@x.test", Set.of(RoleType.CUSTOMER)));
        when(cache.isRevoked(9L, IAT)).thenReturn(false);

        sweeper.sweep();

        verify(gone).close(CloseStatus.POLICY_VIOLATION);
        verify(fine, never()).close(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void aSocketWhoseTokenWasRevokedAfterIssueIsClosed() throws Exception {
        WebSocketSession revoked = session("s1", 7L);
        when(cache.get(7L)).thenReturn(new SessionData("a@x.test", Set.of(RoleType.CUSTOMER)));
        when(cache.isRevoked(7L, IAT)).thenReturn(true);

        sweeper.sweep();

        verify(revoked).close(CloseStatus.POLICY_VIOLATION);
    }

    @Test
    void closedSocketsLeaveTheRegistry() throws Exception {
        WebSocketSession s = session("s1", 7L);
        registry.afterConnectionClosed(s);
        when(cache.get(7L)).thenReturn(null);

        sweeper.sweep();

        verify(s, never()).close(org.mockito.ArgumentMatchers.any());
    }
}
