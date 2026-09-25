package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

/**
 * JWT chỉ được kiểm lúc CONNECT. Người dùng "đăng xuất mọi thiết bị" (UserSessionCache.revokeAll)
 * hay bị vô hiệu hoá phải ngừng nhận tin trên socket đang mở — mỗi phút quét lại và đóng phiên
 * không còn hợp lệ, đúng các điều kiện StompAuthInterceptor đã dùng.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatSessionSweeper {

    private final ChatSessionRegistry registry;
    private final UserSessionCache userSessionCache;

    @Scheduled(fixedDelayString = "PT60S", initialDelayString = "PT60S")
    public void sweep() {
        for (WebSocketSession session : registry.sessions()) {
            Map<String, Object> attrs = session.getAttributes();
            Object userId = attrs.get(StompAuthInterceptor.ATTR_USER_ID);
            Object issuedAt = attrs.get(StompAuthInterceptor.ATTR_ISSUED_AT);
            if (!(userId instanceof Long id) || !(issuedAt instanceof Instant iat)) {
                continue; // chưa CONNECT xong: interceptor sẽ từ chối frame kế tiếp
            }
            boolean stillValid =
                    userSessionCache.get(id) != null && !userSessionCache.isRevoked(id, iat);
            if (!stillValid && session.isOpen()) {
                try {
                    session.close(CloseStatus.POLICY_VIOLATION);
                    log.info(
                            "Closed chat socket {} of user {}: session revoked",
                            session.getId(),
                            id);
                } catch (IOException e) {
                    log.warn("Could not close chat socket {}: {}", session.getId(), e.getMessage());
                }
            }
        }
    }
}
