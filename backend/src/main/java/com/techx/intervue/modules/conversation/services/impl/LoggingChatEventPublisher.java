package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import java.time.Instant;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/** Plan 1: chưa có realtime, chỉ ghi log để thấy sự kiện đã được phát ra đúng chỗ. */
@Slf4j
@Service
public class LoggingChatEventPublisher implements ChatEventPublisherInterface {

    @Override
    public void messageCreated(Conversation conversation, MessageResource message) {
        log.debug(
                "chat event: message {} in conversation {} from user {}",
                message.id(),
                conversation.getId(),
                message.senderId());
    }

    @Override
    public void conversationRead(Conversation conversation, Long readerId, Instant readAt) {
        log.debug(
                "chat event: conversation {} read by user {} at {}",
                conversation.getId(),
                readerId,
                readAt);
    }
}
