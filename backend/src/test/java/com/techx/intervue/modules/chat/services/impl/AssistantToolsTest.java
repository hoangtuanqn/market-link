package com.techx.intervue.modules.chat.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.repositories.AdminKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.ChatKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.FarmerKnowledgeRepository;
import com.techx.intervue.modules.chat.resources.AssistantContext;
import com.techx.intervue.modules.chat.resources.FarmerRows.OrderRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import com.techx.intervue.modules.chat.services.impl.AssistantTools.ToolOutcome;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver.Availability;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AssistantToolsTest {

    private static final AssistantContext CUSTOMER =
            new AssistantContext(AssistantAudience.CUSTOMER, 7L, null);
    private static final AssistantContext NO_ONE = null;

    private static final MarketRow BEN_THANH =
            new MarketRow(
                    1L,
                    "Chợ Bến Thành",
                    "Lê Lợi, Quận 1",
                    LocalTime.of(6, 0),
                    LocalTime.of(19, 0),
                    List.of(1, 2, 3, 4, 5, 6));
    private static final MarketRow THAO_DIEN =
            new MarketRow(
                    2L,
                    "Chợ Thảo Điền",
                    "Quốc Hương, Thủ Đức",
                    LocalTime.of(6, 0),
                    LocalTime.of(20, 0),
                    List.of(0, 6));

    private ChatKnowledgeRepository knowledge;
    private ProductAvailabilityResolver availability;
    private FarmerKnowledgeRepository farmerKnowledge;
    private AdminKnowledgeRepository adminKnowledge;
    private AssistantTools tools;

    @BeforeEach
    void setUp() {
        knowledge = mock(ChatKnowledgeRepository.class);
        availability = mock(ProductAvailabilityResolver.class);
        farmerKnowledge = mock(FarmerKnowledgeRepository.class);
        adminKnowledge = mock(AdminKnowledgeRepository.class);
        tools =
                new AssistantTools(
                        knowledge,
                        farmerKnowledge,
                        adminKnowledge,
                        availability,
                        new UserGuideIndex());
        when(knowledge.activeMarkets()).thenReturn(List.of(BEN_THANH, THAO_DIEN));
    }

    @Test
    void searchProductsResolvesTheMarketNameAndReportsNearestDateStock() {
        when(knowledge.searchProducts("cà chua", 1L, false))
                .thenReturn(
                        List.of(
                                new ProductRow(
                                        9L,
                                        "Cà chua bi",
                                        new BigDecimal("1.20"),
                                        "kg",
                                        99,
                                        "available",
                                        4L,
                                        "Vườn Út Hiền",
                                        List.of("Chợ Bến Thành"))));
        when(availability.resolve(Map.of(9L, new BigDecimal("1.20"))))
                .thenReturn(
                        Map.of(
                                9L,
                                new Availability(
                                        LocalDate.of(2026, 9, 28), 7, new BigDecimal("1.15"))));

        ToolOutcome out =
                tools.run(
                        CUSTOMER,
                        AssistantTools.SEARCH_PRODUCTS,
                        Map.of("keyword", "cà chua", "market", "chợ bến thành"));

        assertThat(out.error()).isFalse();
        assertThat(out.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
        assertThat(out.content())
                .contains("\"price_usd\":1.15")
                .contains("\"left\":7")
                .contains("\"next_pickup_date\":\"2026-09-28\"")
                .contains("\"market\":\"Chợ Bến Thành\"");
        assertThat(out.cards()).extracting("type", "id").containsExactly(tuple("product", 9L));
        // USD with cents, like every amount in the app (docs/decisions.md, 27/09)
        assertThat(out.cards().getFirst().subtitle()).isEqualTo("$1.15/kg · Vườn Út Hiền");
    }

    @Test
    void anUnknownMarketIsAnErrorThatListsTheRealOnesAndRunsNoSearch() {
        ToolOutcome out =
                tools.run(
                        CUSTOMER,
                        AssistantTools.SEARCH_PRODUCTS,
                        Map.of("keyword", "cà chua", "market", "Chợ Không Có"));

        assertThat(out.error()).isTrue();
        assertThat(out.content()).contains("Chợ Bến Thành").contains("Chợ Thảo Điền");
        verify(knowledge, never()).searchProducts(any(), any(), anyBoolean());
    }

    @Test
    void askingAboutStockAlsoListsSoldOutProducts() {
        tools.run(
                CUSTOMER,
                AssistantTools.SEARCH_PRODUCTS,
                Map.of("keyword", "xà lách", "include_sold_out", true));

        verify(knowledge).searchProducts("xà lách", null, true);
    }

    @Test
    void missingKeywordIsAnError() {
        ToolOutcome out = tools.run(CUSTOMER, AssistantTools.SEARCH_PRODUCTS, Map.of());

        assertThat(out.error()).isTrue();
        assertThat(out.content()).contains("keyword");
    }

    @Test
    void listMarketsFiltersByDay() {
        ToolOutcome out =
                tools.run(CUSTOMER, AssistantTools.LIST_MARKETS, Map.of("day_of_week", 0));

        assertThat(out.intent()).isEqualTo(ChatIntent.MARKET_HOURS);
        assertThat(out.content()).contains("Chợ Thảo Điền").doesNotContain("Chợ Bến Thành");
        assertThat(out.cards()).extracting("id").containsExactly(2L);
    }

    @Test
    void dayOutsideZeroToSixIsAnError() {
        ToolOutcome out =
                tools.run(CUSTOMER, AssistantTools.LIST_MARKETS, Map.of("day_of_week", 7));

        assertThat(out.error()).isTrue();
    }

    @Test
    void pickupTimesNeedAStallOrAMarket() {
        ToolOutcome out = tools.run(CUSTOMER, AssistantTools.PICKUP_TIMES, Map.of());

        assertThat(out.error()).isTrue();
        verify(knowledge, never()).farmerSchedules(any(), any(), any());
    }

    @Test
    void pickupTimesOfANamedStall() {
        when(knowledge.approvedFarmers()).thenReturn(List.of(new FarmerRow(4L, "Vườn Út Hiền")));
        when(knowledge.farmerSchedules(eq(4L), eq(null), eq(6)))
                .thenReturn(
                        List.of(
                                new ScheduleRow(
                                        4L,
                                        "Vườn Út Hiền",
                                        1L,
                                        "Chợ Bến Thành",
                                        6,
                                        LocalTime.of(7, 0),
                                        LocalTime.of(11, 0))));

        ToolOutcome out =
                tools.run(
                        CUSTOMER,
                        AssistantTools.PICKUP_TIMES,
                        Map.of("stall", "vườn út hiền", "day_of_week", 6));

        assertThat(out.intent()).isEqualTo(ChatIntent.PICKUP_WINDOW);
        assertThat(out.content())
                .contains("\"pickup_from\":\"07:00\"")
                .contains("\"day\":\"Saturday\"");
        assertThat(out.cards()).extracting("type", "id").containsExactly(tuple("farmer", 4L));
    }

    @Test
    void userGuideSearchReturnsSectionsWithoutCards() {
        ToolOutcome out =
                tools.run(CUSTOMER, AssistantTools.SEARCH_GUIDE, Map.of("query", "quên mật khẩu"));

        assertThat(out.intent()).isEqualTo(ChatIntent.HELP);
        assertThat(out.content()).contains("Quên mật khẩu").contains("15 phút");
        assertThat(out.cards()).isEmpty();
    }

    @Test
    void unknownToolIsAnError() {
        assertThat(tools.run(CUSTOMER, "drop_table", Map.of()).error()).isTrue();
    }

    @Test
    void everyToolIsDeclaredForClaude() {
        assertThat(AssistantTools.definitionsFor(AssistantAudience.CUSTOMER))
                .extracting(t -> t.name())
                .containsExactlyInAnyOrder(
                        AssistantTools.SEARCH_PRODUCTS,
                        AssistantTools.LIST_MARKETS,
                        AssistantTools.FIND_STALLS,
                        AssistantTools.PICKUP_TIMES,
                        AssistantTools.SEARCH_GUIDE);
    }

    private static org.assertj.core.groups.Tuple tuple(Object... values) {
        return org.assertj.core.groups.Tuple.tuple(values);
    }

    @Test
    void toolsOutsideTheAudienceAreRefused() {
        // Filtering happens server-side: even a tool that exists is refused for the wrong audience.
        assertThat(
                        AssistantTools.allows(
                                AssistantAudience.CUSTOMER, AssistantTools.SEARCH_PRODUCTS))
                .isTrue();
        assertThat(AssistantTools.allows(null, AssistantTools.SEARCH_PRODUCTS)).isFalse();
        assertThat(
                        tools.run(
                                        null,
                                        AssistantTools.SEARCH_PRODUCTS,
                                        Map.of("keyword", "cà chua"))
                                .error())
                .isTrue();
    }

    // ------------------------------------------------------------------ FR-093 ownership

    private static final AssistantContext FARMER_9 =
            new AssistantContext(AssistantAudience.FARMER, 7L, 9L);

    @Test
    void farmerToolsAreNotOfferedToCustomers() {
        assertThat(AssistantTools.allows(AssistantAudience.CUSTOMER, AssistantTools.MY_ORDERS))
                .isFalse();
        assertThat(AssistantTools.allows(AssistantAudience.FARMER, AssistantTools.MY_ORDERS))
                .isTrue();
        // A Farmer still gets the catalogue tools, so shopping questions keep working.
        assertThat(AssistantTools.allows(AssistantAudience.FARMER, AssistantTools.SEARCH_PRODUCTS))
                .isTrue();
    }

    @Test
    void aFarmerToolReadsTheStallFromTheContextAndIgnoresAnyIdInTheArguments() {
        when(farmerKnowledge.myOrders(9L, "placed", null)).thenReturn(List.of());

        // The model tries to name a different stall; the argument is not even looked at.
        tools.run(
                FARMER_9,
                AssistantTools.MY_ORDERS,
                Map.of("status", "placed", "farmer_id", 4321, "farmerId", 4321));

        verify(farmerKnowledge).myOrders(9L, "placed", null);
        verify(farmerKnowledge, never()).myOrders(eq(4321L), any(), any());
    }

    @Test
    void aFarmerToolWithoutAStallIsAnErrorRatherThanAnUnscopedRead() {
        ToolOutcome out =
                tools.run(
                        new AssistantContext(AssistantAudience.FARMER, 7L, null),
                        AssistantTools.MY_ORDERS,
                        Map.of());

        assertThat(out.error()).isTrue();
        verifyNoInteractions(farmerKnowledge);
    }

    @Test
    void salesNeedsBothDatesAndARangeThatMakesSense() {
        assertThat(
                        tools.run(
                                        FARMER_9,
                                        AssistantTools.MY_SALES,
                                        Map.of("from_date", "2026-09-01"))
                                .error())
                .isTrue();
        assertThat(
                        tools.run(
                                        FARMER_9,
                                        AssistantTools.MY_SALES,
                                        Map.of("from_date", "2026-09-30", "to_date", "2026-09-01"))
                                .error())
                .isTrue();
        verifyNoInteractions(farmerKnowledge);
    }

    // ------------------------------------------------------------------ FR-094 admin boundary

    @Test
    void adminToolsAreOnlyOfferedToAdmins() {
        assertThat(AssistantTools.allows(AssistantAudience.ADMIN, AssistantTools.PLATFORM_STATS))
                .isTrue();
        assertThat(AssistantTools.allows(AssistantAudience.FARMER, AssistantTools.PLATFORM_STATS))
                .isFalse();
        assertThat(
                        AssistantTools.allows(
                                AssistantAudience.CUSTOMER, AssistantTools.SEARCH_ACCOUNTS))
                .isFalse();
        // And an admin is not handed the farmer tools either: they own no stall.
        assertThat(AssistantTools.allows(AssistantAudience.ADMIN, AssistantTools.MY_ORDERS))
                .isFalse();
    }

    @Test
    void aFarmerAskingForPlatformStatsIsRefusedWithoutTouchingTheDatabase() {
        ToolOutcome out =
                tools.run(
                        FARMER_9,
                        AssistantTools.PLATFORM_STATS,
                        Map.of("from_date", "2026-09-01", "to_date", "2026-09-30"));

        assertThat(out.error()).isTrue();
        verifyNoInteractions(adminKnowledge);
    }

    // ----------------------------------------------------- FR-093 proposals never write

    private static OrderRow order(String code, String status) {
        return new OrderRow(
                77L,
                code,
                "Nguyễn Thị Tư",
                "Chợ Thảo Điền",
                java.time.LocalDate.of(2026, 9, 26),
                java.time.LocalTime.of(6, 0),
                java.time.LocalTime.of(9, 30),
                java.time.LocalDateTime.of(2026, 9, 25, 19, 0),
                new java.math.BigDecimal("120000"),
                status,
                3);
    }

    @Test
    void proposingAnOrderActionReturnsAButtonAndChangesNothing() {
        when(farmerKnowledge.myOrderByCode(9L, "ML-1"))
                .thenReturn(java.util.Optional.of(order("ML-1", "placed")));

        ToolOutcome out =
                tools.run(
                        FARMER_9,
                        AssistantTools.PROPOSE_ORDER_ACTION,
                        Map.of("order_code", "ML-1", "action", "accept"));

        assertThat(out.error()).isFalse();
        assertThat(out.actions())
                .singleElement()
                .satisfies(
                        a -> {
                            assertThat(a.action()).isEqualTo("accept_order");
                            assertThat(a.id()).isEqualTo(77L);
                        });
        assertThat(out.content()).contains("nothing_changed_yet");
        // The only repository call is the read that verified ownership.
        verify(farmerKnowledge).myOrderByCode(9L, "ML-1");
        verifyNoMoreInteractions(farmerKnowledge);
    }

    @Test
    void anOrderInTheWrongStateIsNotOffered() {
        when(farmerKnowledge.myOrderByCode(9L, "ML-2"))
                .thenReturn(java.util.Optional.of(order("ML-2", "completed")));

        ToolOutcome out =
                tools.run(
                        FARMER_9,
                        AssistantTools.PROPOSE_ORDER_ACTION,
                        Map.of("order_code", "ML-2", "action", "accept"));

        assertThat(out.error()).isTrue();
        assertThat(out.actions()).isEmpty();
    }

    @Test
    void anOrderCodeFromAnotherStallIsSimplyNotFound() {
        when(farmerKnowledge.myOrderByCode(9L, "ML-OTHER")).thenReturn(java.util.Optional.empty());

        ToolOutcome out =
                tools.run(
                        FARMER_9,
                        AssistantTools.PROPOSE_ORDER_ACTION,
                        Map.of("order_code", "ML-OTHER", "action", "accept"));

        assertThat(out.error()).isTrue();
        assertThat(out.actions()).isEmpty();
        // Same wording as a code that does not exist, so it cannot be used to probe other stalls.
        assertThat(out.content()).contains("No order ML-OTHER on this stall.");
    }

    @Test
    void customersAndAdminsAreNotOfferedTheOrderProposal() {
        assertThat(
                        AssistantTools.allows(
                                AssistantAudience.CUSTOMER, AssistantTools.PROPOSE_ORDER_ACTION))
                .isFalse();
        assertThat(
                        AssistantTools.allows(
                                AssistantAudience.ADMIN, AssistantTools.PROPOSE_ORDER_ACTION))
                .isFalse();
        assertThat(
                        AssistantTools.allows(
                                AssistantAudience.FARMER, AssistantTools.PROPOSE_FARMER_DECISION))
                .isFalse();
    }
}
