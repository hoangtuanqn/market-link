package com.techx.intervue.modules.conversation.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.services.impl.UserSessionCache;
import com.techx.intervue.modules.user.services.impl.UserSessionCache.SessionData;
import com.techx.intervue.modules.user.services.interfaces.JwtServiceInterface;
import com.techx.intervue.services.interfaces.BlacklistServiceInterface;
import io.jsonwebtoken.ExpiredJwtException;
import java.time.Instant;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;

class StompAuthInterceptorTest {

    JwtServiceInterface jwt;
    BlacklistServiceInterface blacklist;
    UserSessionCache sessions;
    StompAuthInterceptor interceptor;
    MessageChannel channel = mock(MessageChannel.class);

    @BeforeEach
    void setUp() {
        jwt = mock(JwtServiceInterface.class);
        blacklist = mock(BlacklistServiceInterface.class);
        sessions = mock(UserSessionCache.class);
        interceptor = new StompAuthInterceptor(jwt, blacklist, sessions);
        when(jwt.extractJti("good")).thenReturn("jti-1");
        when(jwt.extractSubject("good")).thenReturn(7L);
        when(jwt.extractIssuedAt("good")).thenReturn(Instant.parse("2026-09-25T06:00:00Z"));
        when(blacklist.isRevoked("jti-1")).thenReturn(false);
        when(sessions.get(7L)).thenReturn(new SessionData("an@x.test", Set.of(RoleType.CUSTOMER)));
        when(sessions.isRevoked(7L, Instant.parse("2026-09-25T06:00:00Z"))).thenReturn(false);
    }

    private static Message<byte[]> frame(StompCommand cmd, String authHeader, String destination) {
        StompHeaderAccessor a = StompHeaderAccessor.create(cmd);
        a.setSessionId("s1");
        a.setLeaveMutable(true);
        if (authHeader != null) a.setNativeHeader("Authorization", authHeader);
        if (destination != null) a.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], a.getMessageHeaders());
    }

    private static Message<byte[]> withUser(Message<byte[]> m, String userId) {
        StompHeaderAccessor a = StompHeaderAccessor.wrap(m);
        a.setLeaveMutable(true);
        a.setUser(StompAuthInterceptor.principalFor(userId, Set.of(RoleType.CUSTOMER)));
        return MessageBuilder.createMessage(m.getPayload(), a.getMessageHeaders());
    }

    @Test
    void connectWithAValidTokenSetsTheUserIdAsPrincipalName() {
        Message<?> out =
                interceptor.preSend(frame(StompCommand.CONNECT, "Bearer good", null), channel);

        assertThat(StompHeaderAccessor.wrap(out).getUser().getName()).isEqualTo("7");
    }

    @Test
    void connectWithoutAuthorizationIsRejected() {
        assertThatThrownBy(
                        () -> interceptor.preSend(frame(StompCommand.CONNECT, null, null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWithRevokedTokenIsRejected() {
        when(blacklist.isRevoked("jti-1")).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        frame(StompCommand.CONNECT, "Bearer good", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWithExpiredTokenIsRejected() {
        when(jwt.extractJti("old")).thenThrow(new ExpiredJwtException(null, null, "expired"));

        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        frame(StompCommand.CONNECT, "Bearer old", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void connectWhoseSessionWasLoggedOutEverywhereIsRejected() {
        when(sessions.get(7L)).thenReturn(null);

        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        frame(StompCommand.CONNECT, "Bearer good", null), channel))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void subscribeToOwnUserQueueIsAllowed() {
        Message<byte[]> sub = frame(StompCommand.SUBSCRIBE, null, "/user/queue/messages");
        assertThat(interceptor.preSend(withUser(sub, "7"), channel)).isNotNull();
    }

    @Test
    void subscribeOutsideUserQueueIsRejected() {
        for (String dest :
                new String[] {
                    "/queue/messages-user9abc", "/topic/conversations/42", "/user/topic/x"
                }) {
            assertThatThrownBy(
                            () ->
                                    interceptor.preSend(
                                            withUser(
                                                    frame(StompCommand.SUBSCRIBE, null, dest), "7"),
                                            channel))
                    .as(dest)
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void sendOutsideAppPrefixIsRejected() {
        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        withUser(
                                                frame(
                                                        StompCommand.SEND,
                                                        null,
                                                        "/queue/messages-user9abc"),
                                                "7"),
                                        channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void sendWithoutPrincipalIsRejected() {
        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        frame(StompCommand.SEND, null, "/app/typing"), channel))
                .isInstanceOf(AccessDeniedException.class);
    }
}
