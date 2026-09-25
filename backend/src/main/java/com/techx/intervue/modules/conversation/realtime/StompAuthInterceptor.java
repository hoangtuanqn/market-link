package com.techx.intervue.modules.conversation.realtime;

import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import io.jsonwebtoken.JwtException;
import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Spec 7.3 / 7.4. CONNECT: JWT ở header Authorization, kiểm đúng như JwtAuthFilter (blacklist jti,
 * session trong Redis, mốc revoke). Principal.getName() = userId để service phát tin theo id.
 * CONNECT và bí danh STOMP (1.2) xác thực như nhau. SUBSCRIBE: chỉ /user/topic/**. SEND: chỉ
 * /app/**. MESSAGE và các frame server→client (CONNECTED, RECEIPT, ERROR) mà client gửi lên là tiêm
 * sự kiện giả → từ chối. Ném exception → Spring trả frame ERROR và đóng kết nối; client chưa xác
 * thực không bao giờ được giữ phiên.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompAuthInterceptor implements ChannelInterceptor {

    public static final String USER_TOPIC_PREFIX = "/user/topic/";

    /**
     * Session attributes (chia sẻ với WebSocketSession) để ChatSessionSweeper biết phiên của ai.
     */
    public static final String ATTR_USER_ID = "chat.userId";

    public static final String ATTR_ISSUED_AT = "chat.issuedAt";
    private static final String APP_PREFIX = "/app/";

    private record Authenticated(Principal principal, Long userId, Instant issuedAt) {}

    private final JwtServiceInterface jwtService;
    private final BlacklistServiceInterface blacklistService;
    private final UserSessionCache userSessionCache;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }
        switch (accessor.getCommand()) {
            case CONNECT, STOMP -> {
                Authenticated auth = authenticate(accessor.getFirstNativeHeader("Authorization"));
                accessor.setUser(auth.principal());
                Map<String, Object> attrs = accessor.getSessionAttributes();
                if (attrs != null) {
                    attrs.put(ATTR_USER_ID, auth.userId());
                    attrs.put(ATTR_ISSUED_AT, auth.issuedAt());
                }
            }
            case SUBSCRIBE -> {
                requireUser(accessor);
                String dest = accessor.getDestination();
                if (dest == null || !dest.startsWith(USER_TOPIC_PREFIX)) {
                    throw new AccessDeniedException("You can only subscribe to your own queues.");
                }
            }
            case SEND -> {
                requireUser(accessor);
                String dest = accessor.getDestination();
                if (dest == null || !dest.startsWith(APP_PREFIX)) {
                    throw new AccessDeniedException("Messages are sent over the REST API.");
                }
            }
            // Frame quản lý phiên: cần danh tính, không có destination để kiểm
            case UNSUBSCRIBE, DISCONNECT, ACK, NACK, BEGIN, COMMIT, ABORT -> requireUser(accessor);
            // MESSAGE / CONNECTED / RECEIPT / ERROR là frame server→client: client gửi lên là giả
            // mạo
            default -> throw new AccessDeniedException("Unexpected frame.");
        }
        return message;
    }

    private Authenticated authenticate(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            throw new BadCredentialsException("Sign in to use chat.");
        }
        String token = header.substring(7);
        try {
            if (Boolean.TRUE.equals(blacklistService.isRevoked(jwtService.extractJti(token)))) {
                throw new BadCredentialsException("Your token is not valid.");
            }
            Long userId = jwtService.extractSubject(token);
            Instant issuedAt = jwtService.extractIssuedAt(token);
            UserSessionCache.SessionData session = userSessionCache.get(userId);
            if (session == null || userSessionCache.isRevoked(userId, issuedAt)) {
                throw new BadCredentialsException("Your session has expired.");
            }
            return new Authenticated(
                    principalFor(String.valueOf(userId), session.roles()), userId, issuedAt);
        } catch (JwtException e) {
            throw new BadCredentialsException("Token authentication failed.");
        }
    }

    private static void requireUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() == null) {
            throw new AccessDeniedException("Sign in to use chat.");
        }
    }

    /** Name = userId. Task 4–6 dùng convertAndSendToUser(userId, ...) và Long.parseLong(name). */
    static Principal principalFor(String userId, Set<RoleType> roles) {
        return new UsernamePasswordAuthenticationToken(
                userId,
                null,
                roles.stream()
                        .map(r -> new SimpleGrantedAuthority("ROLE_" + r))
                        .collect(Collectors.toSet()));
    }
}
