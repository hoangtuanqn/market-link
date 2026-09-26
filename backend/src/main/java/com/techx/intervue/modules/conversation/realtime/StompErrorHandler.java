package com.techx.intervue.modules.conversation.realtime;

import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

/**
 * By default Spring puts the message of MessageDeliveryException ("Failed to send message to
 * ExecutorSubscribableChannel…") into the ERROR frame; the client cannot tell "token expired,
 * refresh and reconnect" from "do not try again". Here we take our own root cause when it is an
 * authentication / authorization error.
 */
@Component
public class StompErrorHandler extends StompSubProtocolErrorHandler {

    @Override
    protected Message<byte[]> handleInternal(
            StompHeaderAccessor errorHeaderAccessor,
            byte[] errorPayload,
            Throwable cause,
            StompHeaderAccessor clientHeaderAccessor) {
        Throwable root = cause;
        while (root != null
                && !(root instanceof BadCredentialsException)
                && !(root instanceof AccessDeniedException)) {
            root = root.getCause();
        }
        if (root != null) {
            errorHeaderAccessor.setMessage(root.getMessage());
        }
        return super.handleInternal(errorHeaderAccessor, errorPayload, cause, clientHeaderAccessor);
    }
}
