package com.techx.intervue.modules.conversation.realtime;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

/**
 * Open sockets, so ChatSessionSweeper can close sessions that were revoked. Attached to the
 * transport through WebSocketConfig.configureWebSocketTransport. One instance — with several
 * instances each node sweeps its own sockets, which is still correct.
 */
@Component
public class ChatSessionRegistry implements WebSocketHandlerDecoratorFactory {

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    public void afterConnectionClosed(WebSocketSession session) {
        sessions.remove(session.getId());
    }

    public Collection<WebSocketSession> sessions() {
        return List.copyOf(sessions.values());
    }

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new WebSocketHandlerDecorator(handler) {
            @Override
            public void afterConnectionEstablished(WebSocketSession session) throws Exception {
                ChatSessionRegistry.this.afterConnectionEstablished(session);
                super.afterConnectionEstablished(session);
            }

            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status)
                    throws Exception {
                ChatSessionRegistry.this.afterConnectionClosed(session);
                super.afterConnectionClosed(session, status);
            }
        };
    }
}
