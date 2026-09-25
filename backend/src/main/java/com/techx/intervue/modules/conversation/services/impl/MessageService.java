package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.AttachmentAlreadyUsedException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentNotYoursException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageAttachmentRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.SendMessageRequest;
import com.techx.intervue.modules.conversation.resources.MessageResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.modules.conversation.services.interfaces.MessageServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MessageService implements MessageServiceInterface {

    /** Khớp VARCHAR(160) của conversations.last_message_text. */
    static final int PREVIEW_LENGTH = 160;

    /** Không cho client kéo cả lịch sử một lần. */
    static final int MAX_PAGE = 50;

    /** Xem trước của tin ảnh trong danh sách thread — không có chữ nào để hiện. */
    static final String IMAGE_PREVIEW = "Photo";

    private final MessageRepository messages;
    private final ConversationRepository conversations;
    private final UserRepository users;
    private final StallAccessPolicyInterface policy;
    private final ChatEventPublisherInterface events;
    private final ConversationLookup lookup;
    private final Clock clock;
    private final ChatRateLimiterInterface rateLimiter;
    private final MessageAttachmentRepository attachments;

    @Override
    @Transactional
    public MessageResource send(Long meId, Long conversationId, SendMessageRequest request) {
        rateLimiter.check(meId, ChatRateLimiterInterface.Action.MESSAGE);
        MessageKind kind = request.kind() == null ? MessageKind.TEXT : request.kind();
        if (kind != MessageKind.TEXT && kind != MessageKind.IMAGE) {
            throw new UnsupportedMessageKindException(kind);
        }
        String body = request.body() == null ? "" : request.body().strip();
        if (kind == MessageKind.TEXT && body.isEmpty()) {
            throw new EmptyMessageException();
        }
        if (kind == MessageKind.IMAGE && request.attachmentId() == null) {
            throw new EmptyMessageException();
        }

        Conversation conversation = lookup.requireMember(meId, conversationId);
        User me = requireUser(meId);
        User other = requireUser(conversation.otherMember(meId));
        policy.assertCanSend(me, other);

        // R-06: kiểm ảnh TRƯỚC khi ghi tin, để một ảnh không phải của mình không tạo ra tin rỗng
        MessageAttachment attachment =
                kind == MessageKind.IMAGE
                        ? requireOwnUnusedAttachment(meId, request.attachmentId())
                        : null;

        Instant now = clock.instant();
        Message saved =
                messages.save(
                        Message.builder()
                                .conversationId(conversation.getId())
                                .senderId(meId)
                                .kind(kind)
                                .body(body.isEmpty() ? null : body)
                                .productId(request.productId())
                                .orderId(request.orderId())
                                .build());

        if (attachment != null) {
            attachment.setMessageId(saved.getId());
            attachments.save(attachment);
        }

        conversation.noteNewMessage(kind == MessageKind.IMAGE ? IMAGE_PREVIEW : preview(body), now);
        // Người gửi đương nhiên đã đọc tới đây; unread của người kia tính theo mốc của họ.
        conversation.markRead(meId, now);
        conversations.save(conversation);

        MessageResource resource = MessageResource.from(saved, attachment);
        // Chỉ phát khi đã commit: Plan 2 cắm STOMP vào seam này mà không được phát row chưa tồn
        // tại.
        TransactionHelper.afterCommit(() -> events.messageCreated(conversation, resource));
        // Trả lời nghĩa là đã đọc tới đây: bên kia thấy "đã xem" mà không cần ta gọi /read.
        TransactionHelper.afterCommit(() -> events.conversationRead(conversation, meId, now));
        return resource;
    }

    /** Ảnh phải là của chính mình và chưa gắn vào tin nào — spec §8.2. */
    private MessageAttachment requireOwnUnusedAttachment(Long meId, Long attachmentId) {
        MessageAttachment attachment =
                attachments
                        .findById(attachmentId)
                        .orElseThrow(() -> new EntityNotFoundException("Photo not found."));
        if (!attachment.getUploaderId().equals(meId)) {
            throw new AttachmentNotYoursException();
        }
        if (attachment.getMessageId() != null) {
            throw new AttachmentAlreadyUsedException();
        }
        return attachment;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageResource> list(Long meId, Long conversationId, Long before, int size) {
        lookup.requireMember(meId, conversationId);
        Pageable page = PageRequest.of(0, Math.min(Math.max(size, 1), MAX_PAGE));
        List<Message> found =
                before == null
                        ? messages.findByConversationIdAndHiddenAtIsNullOrderByIdDesc(
                                conversationId, page)
                        : messages.findByConversationIdAndIdLessThanAndHiddenAtIsNullOrderByIdDesc(
                                conversationId, before, page);
        // Một truy vấn cho cả trang, không N+1
        List<Long> imageIds =
                found.stream()
                        .filter(m -> m.getKind() == MessageKind.IMAGE)
                        .map(Message::getId)
                        .toList();
        Map<Long, MessageAttachment> byMessage =
                imageIds.isEmpty()
                        ? Map.of()
                        : attachments.findByMessageIdIn(imageIds).stream()
                                .collect(
                                        Collectors.toMap(
                                                MessageAttachment::getMessageId,
                                                a -> a,
                                                (a, b) -> a));
        return found.stream().map(m -> MessageResource.from(m, byMessage.get(m.getId()))).toList();
    }

    private User requireUser(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Account not found."));
    }

    static String preview(String body) {
        return body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH);
    }
}
