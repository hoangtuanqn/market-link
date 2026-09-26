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
        Message<byte[]> sub = frame(StompCommand.SUBSCRIBE, null, "/user/topic/messages");
        assertThat(interceptor.preSend(withUser(sub, "7"), channel)).isNotNull();
    }

    @Test
    void subscribeOutsideUserQueueIsRejected() {
        for (String dest :
                new String[] {
                    "/queue/messages-user9abc",
                    "/topic/messages-user9abc",
                    "/user/queue/messages",
                    "/user/x/topic/messages"
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

    /**
     * STOMP is an alias of CONNECT (STOMP 1.2): it must authenticate identically, it must not slip
     * through the default.
     */
    @Test
    void stompFrameIsAuthenticatedLikeConnect() {
        assertThatThrownBy(
                        () -> interceptor.preSend(frame(StompCommand.STOMP, null, null), channel))
                .isInstanceOf(BadCredentialsException.class);
        Message<?> out =
                interceptor.preSend(frame(StompCommand.STOMP, "Bearer good", null), channel);
        assertThat(StompHeaderAccessor.wrap(out).getUser().getName()).isEqualTo("7");
    }

    /**
     * MESSAGE is a server → client frame; a client sending it up is injecting a fake event into
     * someone else's queue.
     */
    @Test
    void messageFrameFromAClientIsRejectedEvenWithAPrincipal() {
        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        withUser(
                                                frame(
                                                        StompCommand.MESSAGE,
                                                        null,
                                                        "/user/3/topic/messages"),
                                                "7"),
                                        channel))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(
                        () ->
                                interceptor.preSend(
                                        frame(StompCommand.MESSAGE, null, "/user/3/topic/messages"),
                                        channel))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void serverOnlyFramesAreRejected() {
        for (StompCommand cmd :
                new StompCommand[] {
                    StompCommand.CONNECTED, StompCommand.RECEIPT, StompCommand.ERROR
                }) {
            assertThatThrownBy(
                            () ->
                                    interceptor.preSend(
                                            withUser(frame(cmd, null, null), "7"), channel))
                    .as(cmd.name())
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    @Test
    void housekeepingFramesNeedAPrincipalButNoDestinationCheck() {
        for (StompCommand cmd :
                new StompCommand[] {
                    StompCommand.UNSUBSCRIBE,
                    StompCommand.DISCONNECT,
                    StompCommand.ACK,
                    StompCommand.NACK
                }) {
            assertThat(interceptor.preSend(withUser(frame(cmd, null, null), "7"), channel))
                    .as(cmd.name())
                    .isNotNull();
            assertThatThrownBy(() -> interceptor.preSend(frame(cmd, null, null), channel))
                    .as(cmd.name() + " without principal")
                    .isInstanceOf(AccessDeniedException.class);
        }
    }

    /**
     * The sweep of revoked sessions needs to know whose session this is and when the token was
     * issued.
     */
    @Test
    void connectStoresUserIdAndIssuedAtInTheSessionAttributes() {
        StompHeaderAccessor a = StompHeaderAccessor.create(StompCommand.CONNECT);
        a.setSessionId("s1");
        a.setLeaveMutable(true);
        a.setNativeHeader("Authorization", "Bearer good");
        java.util.Map<String, Object> attrs = new java.util.HashMap<>();
        a.setSessionAttributes(attrs);

        interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], a.getMessageHeaders()), channel);

        assertThat(attrs).containsEntry(StompAuthInterceptor.ATTR_USER_ID, 7L);
        assertThat(attrs)
                .containsEntry(
                        StompAuthInterceptor.ATTR_ISSUED_AT, Instant.parse("2026-09-25T06:00:00Z"));
    }
}
