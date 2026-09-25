package com.techx.intervue.modules.chat.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.chat.entities.ChatMessage;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.repositories.ChatKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.ChatMessageRepository;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataAccessResourceFailureException;

class ChatServiceTest {

    private static final String SESSION = "session-123";
    private static final MarketRow BEN_THANH =
            new MarketRow(
                    1L,
                    "Chợ Bến Thành",
                    "Lê Lợi, Quận 1",
                    LocalTime.of(6, 0),
                    LocalTime.of(11, 0),
                    List.of(0, 6));

    private ChatKnowledgeRepository knowledge;
    private ChatMessageRepository messages;
    private ChatService service;

    @BeforeEach
    void setUp() {
        knowledge = mock(ChatKnowledgeRepository.class);
        messages = mock(ChatMessageRepository.class);
        // Thứ 5, 24/09/2026 giờ Việt Nam
        Clock clock =
                Clock.fixed(Instant.parse("2026-09-24T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new ChatService(new IntentClassifier(), knowledge, messages, clock);
        when(knowledge.activeMarkets()).thenReturn(List.of(BEN_THANH));
    }

    private ChatReplyResource ask(String message) {
        return service.reply(new ChatRequest(SESSION, message), null);
    }

    @Test
    void greetingDoesNotTouchDatabaseLookups() {
        ChatReplyResource reply = ask("xin chào");

        assertThat(reply.intent()).isEqualTo(ChatIntent.GREETING);
        verify(knowledge, times(0)).searchProducts(any(), any(), anyBoolean());
    }

    @Test
    void productDetailShowsPriceInVndAndStock() {
        when(knowledge.searchProducts("ca chua", null, true))
                .thenReturn(
                        List.of(
                                new ProductRow(
                                        10L,
                                        "Cà chua bi",
                                        new BigDecimal("35000.00"),
                                        "kg",
                                        12,
                                        "available",
                                        3L,
                                        "Vườn Xanh",
                                        List.of("Chợ Bến Thành"))));

        ChatReplyResource reply = ask("Cà chua giá bao nhiêu?");

        assertThat(reply.intent()).isEqualTo(ChatIntent.PRODUCT_DETAIL);
        assertThat(reply.reply()).contains("35,000 ₫/kg", "12 kg left", "Vườn Xanh");
        assertThat(reply.results()).extracting("type", "id").containsExactly(tuple("product", 10L));
    }

    @Test
    void marketNameIsRemovedFromKeywordAndUsedAsFilter() {
        when(knowledge.searchProducts(eq("rau muong"), eq(1L), eq(false))).thenReturn(List.of());

        ChatReplyResource reply = ask("tìm rau muống ở chợ Bến Thành");

        assertThat(reply.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
        assertThat(reply.reply()).contains("\"rau muong\" at Chợ Bến Thành");
        verify(knowledge).searchProducts("rau muong", 1L, false);
    }

    @Test
    void marketHoursForNamedMarket() {
        ChatReplyResource reply = ask("chợ Bến Thành mở cửa mấy giờ");

        assertThat(reply.intent()).isEqualTo(ChatIntent.MARKET_HOURS);
        assertThat(reply.reply()).contains("06:00–11:00", "Sun, Sat");
    }

    @Test
    void farmerAvailabilityFiltersByMarketAndDay() {
        when(knowledge.farmerSchedules(isNull(), eq(1L), eq(6)))
                .thenReturn(
                        List.of(
                                new ScheduleRow(
                                        3L,
                                        "Vườn Xanh",
                                        1L,
                                        "Chợ Bến Thành",
                                        6,
                                        LocalTime.of(6, 0),
                                        LocalTime.of(10, 0))));

        ChatReplyResource reply = ask("Thứ 7 có farmer nào ở chợ Bến Thành?");

        assertThat(reply.intent()).isEqualTo(ChatIntent.FARMER_AVAILABILITY);
        assertThat(reply.reply()).contains("at Chợ Bến Thành on Sat", "Vườn Xanh", "06:00–10:00");
    }

    @Test
    void pickupWindowMatchesStallName() {
        when(knowledge.approvedFarmers()).thenReturn(List.of(new FarmerRow(3L, "Vườn Xanh")));
        when(knowledge.farmerSchedules(eq(3L), isNull(), isNull()))
                .thenReturn(
                        List.of(
                                new ScheduleRow(
                                        3L,
                                        "Vườn Xanh",
                                        1L,
                                        "Chợ Bến Thành",
                                        0,
                                        LocalTime.of(7, 0),
                                        LocalTime.of(9, 30))));

        ChatReplyResource reply = ask("khung giờ lấy hàng của vuon xanh");

        assertThat(reply.intent()).isEqualTo(ChatIntent.PICKUP_WINDOW);
        assertThat(reply.reply()).contains("Sun · Chợ Bến Thành · 07:00–09:30");
    }

    @Test
    void unknownFallsBackToProductSearch() {
        when(knowledge.searchProducts("bo sap", null, false))
                .thenReturn(
                        List.of(
                                new ProductRow(
                                        11L,
                                        "Bơ sáp",
                                        new BigDecimal("60000"),
                                        "kg",
                                        5,
                                        "available",
                                        4L,
                                        "Nhà Vườn Tư",
                                        List.of())));

        assertThat(ask("bơ sáp").intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
    }

    @Test
    void injectionAttemptIsPassedAsParameterAndAnsweredNormally() {
        when(knowledge.searchProducts(any(), any(), anyBoolean())).thenReturn(List.of());

        ChatReplyResource reply = ask("tìm ' OR 1=1 --");

        assertThat(reply.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
        assertThat(reply.reply()).contains("No products found");
    }

    @Test
    void databaseErrorReturnsFriendlyReplyInsteadOf500() {
        when(knowledge.activeMarkets())
                .thenThrow(new DataAccessResourceFailureException("no table"));

        ChatReplyResource reply = ask("chợ nào họp chủ nhật");

        assertThat(reply.reply()).isEqualTo(ChatService.DATA_UNAVAILABLE_REPLY);
        assertThat(reply.intent()).isEqualTo(ChatIntent.MARKET_HOURS);
    }

    @Test
    void savesUserAndBotMessagesWithIntent() {
        service.reply(new ChatRequest(SESSION, "hello"), 42L);

        ArgumentCaptor<ChatMessage> saved = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messages, times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting("role", "intent", "userId", "sessionKey")
                .containsExactly(
                        tuple(ChatMessage.ROLE_USER, "GREETING", 42L, SESSION),
                        tuple(ChatMessage.ROLE_BOT, "GREETING", 42L, SESSION));
    }

    @Test
    void historyOnlyShowsMessagesOfTheCaller() {
        when(messages.findTop50BySessionKeyOrderByIdDesc(SESSION))
                .thenReturn(
                        List.of(
                                message(3L, 42L, "của user 42"),
                                message(2L, null, "của khách"),
                                message(1L, 7L, "của user 7")));

        assertThat(service.history(SESSION, 42L))
                .extracting("message")
                .containsExactly("của user 42");
        assertThat(service.history(SESSION, null))
                .extracting("message")
                .containsExactly("của khách");
    }

    private static ChatMessage message(Long id, Long userId, String text) {
        return ChatMessage.builder()
                .id(id)
                .sessionKey(SESSION)
                .userId(userId)
                .role(ChatMessage.ROLE_USER)
                .message(text)
                .build();
    }

    @Test
    void coreNameStripsCommonPrefixes() {
        assertThat(ChatService.coreName("Chợ Bến Thành")).isEqualTo("ben thanh");
        assertThat(ChatService.coreName("Sạp Cô Ba")).isEqualTo("co ba");
        assertThat(ChatService.coreName("Vườn Xanh")).isEqualTo("vuon xanh");
    }

    private static org.assertj.core.groups.Tuple tuple(Object... values) {
        return org.assertj.core.groups.Tuple.tuple(values);
    }
}
