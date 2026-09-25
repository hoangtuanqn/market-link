package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import java.security.Principal;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

/**
 * FR-112. Online/offline suy ra từ CONNECT/DISCONNECT (spec 7.4); báo cho những người đã từng nhắn.
 */
@Component
@RequiredArgsConstructor
public class PresenceEventListener {

    public record PresenceEvent(Long userId, boolean online, Instant lastSeenAt) {}

    private final PresenceService presence;
    private final ConversationRepository conversations;
    private final StompChatEventPublisher publisher;

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        Principal user = event.getUser();
        if (user == null) {
            return;
        }
        Long userId = Long.parseLong(user.getName());
        String sessionId = StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
        if (presence.connected(userId, sessionId)) {
            broadcast(userId, new PresenceEvent(userId, true, null));
        }
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user == null) {
            return;
        }
        Long userId = Long.parseLong(user.getName());
        if (presence.disconnected(userId, event.getSessionId())) {
            broadcast(userId, new PresenceEvent(userId, false, presence.lastSeen(userId)));
        }
    }

    private void broadcast(Long userId, PresenceEvent event) {
        for (Long other : conversations.findOtherMemberIds(userId)) {
            publisher.send(other, StompChatEventPublisher.PRESENCE, event);
        }
    }
}
