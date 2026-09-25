package com.techx.intervue.modules.conversation.services.impl;

import com.techx.intervue.helpers.TransactionHelper;
import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.conversation.realtime.PresenceService.PresenceInfo;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository.UnreadRow;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.resources.PagedResource;
import com.techx.intervue.modules.conversation.resources.ParticipantResource;
import com.techx.intervue.modules.conversation.resources.UnreadCountResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ConversationServiceInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ConversationService implements ConversationServiceInterface {

    private final ConversationRepository conversations;
    private final MessageRepository messages;
    private final UserRepository users;
    private final StallAccessPolicyInterface policy;
    private final ChatEventPublisherInterface events;
    private final ConversationLookup lookup;
    private final PresenceService presence;
    private final Clock clock;

    @Override
    @Transactional
    public ConversationResource open(Long meId, OpenConversationRequest request) {
        if (meId.equals(request.farmerUserId())) {
            throw new SelfConversationException();
        }
        User me = requireUser(meId, "Account not found.");
        User target = requireUser(request.farmerUserId(), "Stall not found.");
        policy.assertCanStart(me);

        // Thread cũ trả về ngay cả khi stall đã bị đình chỉ (spec 8.1, D-09: vẫn đọc được;
        // gửi thêm thì send() trả 409). Chính sách "stall có mở không" chỉ gác việc TẠO MỚI.
        Conversation pair = Conversation.between(meId, target.getId());
        Conversation conversation =
                conversations
                        .findByUserAIdAndUserBId(pair.getUserAId(), pair.getUserBId())
                        .orElseGet(
                                () -> {
                                    policy.assertCanBeMessaged(target);
                                    return conversations.save(pair);
                                });
        long unread = unreadFor(meId, List.of(conversation)).getOrDefault(conversation.getId(), 0L);
        PresenceInfo live = presence.snapshot(List.of(target.getId())).get(target.getId());
        return toResource(conversation, target, unread, live);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResource<ConversationResource> listMine(Long meId, int page, int size) {
        Page<Conversation> found = conversations.findMine(meId, PageRequest.of(page - 1, size));
        Map<Long, Long> unread = unreadFor(meId, found.getContent());
        Map<Long, User> others = othersOf(meId, found.getContent());
        Map<Long, PresenceInfo> live = presence.snapshot(others.keySet());
        List<ConversationResource> items =
                found.getContent().stream()
                        .map(
                                c ->
                                        toResource(
                                                c,
                                                others.get(c.otherMember(meId)),
                                                unread.getOrDefault(c.getId(), 0L),
                                                live.get(c.otherMember(meId))))
                        .toList();
        return new PagedResource<>(items, page, size, found.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public UnreadCountResource unreadCount(Long meId) {
        return new UnreadCountResource(messages.countUnread(meId));
    }

    @Override
    @Transactional
    public void markRead(Long meId, Long conversationId) {
        Conversation conversation = lookup.requireMember(meId, conversationId);
        Instant now = clock.instant();
        conversation.markRead(meId, now);
        conversations.save(conversation);
        TransactionHelper.afterCommit(() -> events.conversationRead(conversation, meId, now));
    }

    private User requireUser(Long id, String message) {
        return users.findById(id).orElseThrow(() -> new EntityNotFoundException(message));
    }

    /** Một truy vấn cho cả trang; danh sách rỗng thì không hỏi DB (JPQL "in ()" là lỗi). */
    private Map<Long, Long> unreadFor(Long meId, Collection<Conversation> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = page.stream().map(Conversation::getId).toList();
        return messages.countUnreadByConversation(meId, ids).stream()
                .collect(Collectors.toMap(UnreadRow::getConversationId, UnreadRow::getTotal));
    }

    private Map<Long, User> othersOf(Long meId, Collection<Conversation> page) {
        if (page.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = page.stream().map(c -> c.otherMember(meId)).toList();
        return users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static ConversationResource toResource(
            Conversation c, User other, long unread, PresenceInfo live) {
        return ConversationResource.builder()
                .id(c.getId())
                .other(other == null ? null : ParticipantResource.from(other, live))
                .lastMessageText(c.getLastMessageText())
                .lastMessageAt(c.getLastMessageAt())
                .unreadCount(unread)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
