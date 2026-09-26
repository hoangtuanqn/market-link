package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.entities.Message;
import com.techx.intervue.modules.conversation.entities.MessageAttachment;
import com.techx.intervue.modules.conversation.enums.MessageKind;
import com.techx.intervue.modules.conversation.exceptions.AttachmentAlreadyUsedException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentNotYoursException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.OrderNotInConversationException;
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
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.order.entities.Order;
import com.techx.intervue.modules.order.repositories.OrderRepository;
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

    /** Matches VARCHAR(160) of conversations.last_message_text. */
    static final int PREVIEW_LENGTH = 160;

    /** Do not let the client pull the whole history at once. */
    static final int MAX_PAGE = 50;

    /** Preview of an image message in the thread list — there is no text to show. */
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
    private final OrderRepository orders;
    private final FarmerProfileRepository farmerProfiles;

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

        // R-06: a pinned order must belong to exactly these two people, checked BEFORE writing the
        // message
        if (request.orderId() != null) {
            requireOrderOfThisPair(conversation, request.orderId());
        }

        // R-06: check the image BEFORE writing the message, so an image that is not yours does not
        // create an empty message
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
        // The sender has of course read up to here; the other person's unread is counted from their
        // own marker.
        conversation.markRead(meId, now);
        conversations.save(conversation);

        MessageResource resource = MessageResource.from(saved, attachment);
        // Only publish once committed: Plan 2 plugs STOMP into this seam and must not publish a row
        // that does not yet
        // exist.
        TransactionHelper.afterCommit(() -> events.messageCreated(conversation, resource));
        // Replying means having read up to here: the other side sees "seen" without us calling
        // /read.
        TransactionHelper.afterCommit(() -> events.conversationRead(conversation, meId, now));
        return resource;
    }

    /**
     * FR-114: the order must belong to the customer in the thread, bought at the stall of the
     * Farmer in the thread. orders.farmer_id is farmer_profiles.id, not users.id, so the stall
     * owner must be looked up before comparing. Only READS the order module; there is no path that
     * creates or edits an order from chat.
     */
    private void requireOrderOfThisPair(Conversation conversation, Long orderId) {
        Order order =
                orders.findById(orderId)
                        .orElseThrow(() -> new EntityNotFoundException("Order not found."));
        Long stallOwner =
                farmerProfiles
                        .findById(order.getFarmerId())
                        .map(FarmerProfile::getUserId)
                        .orElseThrow(OrderNotInConversationException::new);
        boolean samePair =
                conversation.hasMember(order.getCustomerId())
                        && conversation.hasMember(stallOwner)
                        && !order.getCustomerId().equals(stallOwner);
        if (!samePair) {
            throw new OrderNotInConversationException();
        }
    }

    /** The image must be your own and not yet attached to any message — spec §8.2. */
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
        // One query for the whole page, no N+1
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
