package com.techx.intervue.modules.conversation.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.conversation.entities.Conversation;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.realtime.PresenceService;
import com.techx.intervue.modules.conversation.repositories.ConversationRepository;
import com.techx.intervue.modules.conversation.repositories.MessageRepository;
import com.techx.intervue.modules.conversation.requests.OpenConversationRequest;
import com.techx.intervue.modules.conversation.resources.ConversationResource;
import com.techx.intervue.modules.conversation.services.interfaces.ChatEventPublisherInterface;
import com.techx.intervue.modules.conversation.services.interfaces.ChatRateLimiterInterface;
import com.techx.intervue.modules.conversation.services.interfaces.StallAccessPolicyInterface;
import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.user.entities.User;
import com.techx.intervue.modules.user.enums.RoleType;
import com.techx.intervue.modules.user.enums.UserStatus;
import com.techx.intervue.modules.user.repositories.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

class ConversationServiceTest {

    static final Instant NOW = Instant.parse("2026-09-25T06:00:00Z");

    ConversationRepository conversations;
    MessageRepository messages;
    UserRepository users;
    FarmerProfileRepository farmerProfiles;
    StallAccessPolicyInterface policy;
    ChatEventPublisherInterface events;
    ChatRateLimiterInterface rateLimiter;
    PresenceService presence;
    ConversationService service;

    User customer =
            User.builder()
                    .id(7L)
                    .fullName("An")
                    .role(RoleType.CUSTOMER)
                    .status(UserStatus.ACTIVE)
                    .build();
    User farmer =
            User.builder()
                    .id(3L)
                    .fullName("Cô Tư")
                    .role(RoleType.FARMER)
                    .status(UserStatus.ACTIVE)
                    .build();

    @BeforeEach
    void setUp() {
        conversations = mock(ConversationRepository.class);
        messages = mock(MessageRepository.class);
        users = mock(UserRepository.class);
        farmerProfiles = mock(FarmerProfileRepository.class);
        policy = mock(StallAccessPolicyInterface.class);
        events = mock(ChatEventPublisherInterface.class);
        rateLimiter = mock(ChatRateLimiterInterface.class);
        presence = mock(PresenceService.class);
        when(presence.snapshot(any())).thenReturn(Map.of());
        Clock clock = Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh"));
        service =
                new ConversationService(
                        conversations,
                        messages,
                        users,
                        farmerProfiles,
                        policy,
                        events,
                        new ConversationLookup(conversations),
                        presence,
                        clock,
                        rateLimiter);
        when(users.findById(7L)).thenReturn(Optional.of(customer));
        when(users.findById(3L)).thenReturn(Optional.of(farmer));
        // id stall (30) và id người dùng (3) cố ý khác nhau — Review Focus #1
        when(farmerProfiles.findById(30L))
                .thenReturn(
                        Optional.of(
                                FarmerProfile.builder()
                                        .id(30L)
                                        .userId(3L)
                                        .stallName("Cô Tư Garden")
                                        .build()));
        when(messages.countUnreadByConversation(anyLong(), anyCollection())).thenReturn(List.of());
        when(conversations.save(any(Conversation.class)))
                .thenAnswer(
                        inv -> {
                            Conversation c = inv.getArgument(0);
                            c.setId(42L);
                            return c;
                        });
    }

    @Test
    void openCreatesTheNormalisedPairWhenNoneExists() {
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());

        ConversationResource result = service.open(7L, new OpenConversationRequest(30L));

        ArgumentCaptor<Conversation> saved = ArgumentCaptor.forClass(Conversation.class);
        verify(conversations).save(saved.capture());
        assertThat(saved.getValue().getUserAId()).isEqualTo(3L);
        assertThat(saved.getValue().getUserBId()).isEqualTo(7L);
        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.other().userId()).isEqualTo(3L);
        assertThat(result.other().fullName()).isEqualTo("Cô Tư");
        assertThat(result.unreadCount()).isZero();
    }

    @Test
    void openReturnsTheExistingThreadWithoutSavingAgain() {
        Conversation existing = Conversation.between(3L, 7L);
        existing.setId(9L);
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.of(existing));

        ConversationResource result = service.open(7L, new OpenConversationRequest(30L));

        assertThat(result.id()).isEqualTo(9L);
        verify(conversations, never()).save(any());
    }

    /** Review Focus #1: id stall và id người dùng là hai dãy số khác nhau. */
    @Test
    void openUsesTheStallOwnerNotTheProfileId() {
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());

        ConversationResource result = service.open(7L, new OpenConversationRequest(30L));

        assertThat(result.other().userId()).isEqualTo(3L);
        verify(users, never()).findById(30L);
    }

    @Test
    void openWithUnknownStallIsNotFound() {
        when(farmerProfiles.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(99L)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessage("Stall not found.");
        verify(conversations, never()).save(any());
    }

    /** Review Focus #2: Farmer bấm "Message this stall" trên chính sạp mình. */
    @Test
    void openRefusesMessagingYourOwnStall() {
        assertThatThrownBy(() -> service.open(3L, new OpenConversationRequest(30L)))
                .isInstanceOf(SelfConversationException.class);
        verify(conversations, never()).save(any());
    }

    @Test
    void openRefusesANewThreadWithAStallThatIsNotOpen() {
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());
        doThrow(new StallNotOpenException()).when(policy).assertCanBeMessaged(farmer);

        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(30L)))
                .isInstanceOf(StallNotOpenException.class);
        verify(policy).assertCanStart(customer);
        verify(conversations, never()).save(any());
    }

    /**
     * Spec 8.1 / D-09: stall bị đình chỉ thì thread cũ vẫn đọc được — mở lại phải trả thread đó.
     */
    @Test
    void openReturnsAnExistingThreadEvenWhenTheStallIsNoLongerOpen() {
        Conversation existing = Conversation.between(3L, 7L);
        existing.setId(9L);
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.of(existing));
        doThrow(new StallNotOpenException()).when(policy).assertCanBeMessaged(farmer);

        ConversationResource result = service.open(7L, new OpenConversationRequest(30L));

        assertThat(result.id()).isEqualTo(9L);
        verify(conversations, never()).save(any());
    }

    @Test
    void aFarmerParticipantCarriesTheirStall() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        when(farmerProfiles.findAllByUserIdIn(anyCollection()))
                .thenReturn(
                        List.of(
                                FarmerProfile.builder()
                                        .id(30L)
                                        .userId(3L)
                                        .stallName("Cô Tư Garden")
                                        .build()));

        var other = service.listMine(7L, 1, 20).items().get(0).other();

        assertThat(other.stallName()).isEqualTo("Cô Tư Garden");
        assertThat(other.farmerId()).isEqualTo(30L);
    }

    @Test
    void aCustomerParticipantHasNoStall() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findMine(eq(3L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(7L))).thenReturn(List.of(customer));
        when(farmerProfiles.findAllByUserIdIn(anyCollection())).thenReturn(List.of());

        var other = service.listMine(3L, 1, 20).items().get(0).other();

        assertThat(other.stallName()).isNull();
        assertThat(other.farmerId()).isNull();
    }

    /** "Seen" phải còn sau khi tải lại trang: mốc đọc của NGƯỜI KIA, không phải của mình. */
    @Test
    void theThreadCarriesWhenTheOtherPersonLastRead() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        c.markRead(3L, NOW.minusSeconds(60));
        c.markRead(7L, NOW);
        when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        when(farmerProfiles.findAllByUserIdIn(anyCollection())).thenReturn(List.of());

        assertThat(service.listMine(7L, 1, 20).items().get(0).otherReadAt())
                .isEqualTo(NOW.minusSeconds(60));
    }

    /** open() đã có hồ sơ stall trong tay: thread vừa mở cũng mang tên stall. */
    @Test
    void anOpenedThreadNamesTheStall() {
        when(conversations.findByUserAIdAndUserBId(3L, 7L)).thenReturn(Optional.empty());

        var other = service.open(7L, new OpenConversationRequest(30L)).other();

        assertThat(other.stallName()).isEqualTo("Cô Tư Garden");
        assertThat(other.farmerId()).isEqualTo(30L);
    }

    @Test
    void listMineMapsTheOtherParticipantAndUnreadCount() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        c.noteNewMessage("Five bunches left", NOW);
        when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        MessageRepository.UnreadRow row = mock(MessageRepository.UnreadRow.class);
        when(row.getConversationId()).thenReturn(42L);
        when(row.getTotal()).thenReturn(2L);
        when(messages.countUnreadByConversation(7L, List.of(42L))).thenReturn(List.of(row));

        var page = service.listMine(7L, 1, 20);

        assertThat(page.total()).isEqualTo(1);
        assertThat(page.page()).isEqualTo(1);
        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).other().fullName()).isEqualTo("Cô Tư");
        assertThat(page.items().get(0).lastMessageText()).isEqualTo("Five bunches left");
        assertThat(page.items().get(0).unreadCount()).isEqualTo(2L);
    }

    @Test
    void listMineWithNoThreadsDoesNotQueryUnreadOrUsers() {
        when(conversations.findMine(eq(7L), any())).thenReturn(Page.empty());

        var page = service.listMine(7L, 1, 20);

        assertThat(page.items()).isEmpty();
        verify(messages, never()).countUnreadByConversation(anyLong(), anyCollection());
        verify(users, never()).findAllById(any());
    }

    @Test
    void unreadCountComesStraightFromTheRepository() {
        when(messages.countUnread(7L)).thenReturn(4L);

        assertThat(service.unreadCount(7L).count()).isEqualTo(4L);
    }

    @Test
    void markReadSetsTheCallersMarkerAndPublishes() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(c));

        service.markRead(7L, 42L);

        assertThat(c.readAtOf(7L)).isEqualTo(NOW);
        assertThat(c.readAtOf(3L)).isNull();
        verify(conversations).save(c);
        verify(events).conversationRead(c, 7L, NOW);
    }

    @Test
    void markReadByANonMemberIsForbidden() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findById(42L)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.markRead(9L, 42L))
                .isInstanceOf(ConversationAccessDeniedException.class);
        verify(conversations, never()).save(any());
    }

    @Test
    void listMineCarriesPresenceOfTheOtherParticipant() {
        Conversation c = Conversation.between(3L, 7L);
        c.setId(42L);
        when(conversations.findMine(eq(7L), any())).thenReturn(new PageImpl<>(List.of(c)));
        when(users.findAllById(List.of(3L))).thenReturn(List.of(farmer));
        Instant seen = Instant.parse("2026-09-25T05:48:00Z");
        // service truyền Set (others.keySet()); Mockito so khớp bằng equals nên không stub bằng
        // List
        when(presence.snapshot(argThat(ids -> ids.contains(3L))))
                .thenReturn(Map.of(3L, new PresenceService.PresenceInfo(false, seen)));

        var page = service.listMine(7L, 1, 20);

        assertThat(page.items().get(0).other().online()).isFalse();
        assertThat(page.items().get(0).other().lastSeenAt()).isEqualTo(seen);
    }

    @Test
    void refusesToOpenANewThreadWhenTheUserIsOverTheHourlyLimit() {
        org.mockito.Mockito.doThrow(new RateLimitedException("too many"))
                .when(rateLimiter)
                .check(7L, ChatRateLimiterInterface.Action.CONVERSATION);

        assertThatThrownBy(() -> service.open(7L, new OpenConversationRequest(30L)))
                .isInstanceOf(RateLimitedException.class);
        verify(conversations, never()).save(any(Conversation.class));
    }

    /**
     * open() là idempotent (spec §6.1). Hạn mức §8.4 đếm "thread MỚI mỗi giờ", nên mở lại một
     * thread đã có không được tiêu lượt — nếu không, FE gọi POST /conversations mỗi lần mở khung
     * chat sẽ tự khoá người dùng khỏi chính cuộc trò chuyện của họ.
     */
    @Test
    void reopeningAnExistingThreadDoesNotSpendARateLimitToken() {
        Conversation existing = Conversation.between(7L, 3L);
        existing.setId(42L);
        when(conversations.findByUserAIdAndUserBId(anyLong(), anyLong()))
                .thenReturn(Optional.of(existing));

        service.open(7L, new OpenConversationRequest(30L));

        verify(rateLimiter, never())
                .check(
                        anyLong(),
                        org.mockito.ArgumentMatchers.any(ChatRateLimiterInterface.Action.class));
    }

    @Test
    void openingABrandNewThreadDoesSpendARateLimitToken() {
        when(conversations.findByUserAIdAndUserBId(anyLong(), anyLong()))
                .thenReturn(Optional.empty());

        service.open(7L, new OpenConversationRequest(30L));

        verify(rateLimiter).check(7L, ChatRateLimiterInterface.Action.CONVERSATION);
    }
}
