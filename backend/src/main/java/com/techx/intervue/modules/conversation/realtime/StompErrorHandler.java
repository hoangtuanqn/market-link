package com.techx.intervue.modules.conversation.realtime;

import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

/**
 * Mặc định Spring đặt thông điệp của MessageDeliveryException ("Failed to send message to
 * ExecutorSubscribableChannel…") vào frame ERROR; client không phân biệt được "token hết hạn, làm
 * mới rồi nối lại" với "đừng thử nữa". Ở đây lấy lý do gốc của ta khi nó là lỗi xác thực / phân
 * quyền.
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
