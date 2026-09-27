package com.techx.intervue.modules.chat.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.anthropic.client.AnthropicClient;
import com.anthropic.core.ObjectMappers;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.services.blocking.MessageService;
import com.techx.intervue.modules.chat.ChatbotAiProperties;
import com.techx.intervue.modules.chat.entities.ChatMessage;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.requests.ChatRequest.PageContext;
import com.techx.intervue.modules.chat.resources.AssistantContext;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ChatResultItem;
import com.techx.intervue.modules.chat.services.impl.AssistantTools.ToolOutcome;
import com.techx.intervue.modules.chat.services.impl.ClaudeAssistant.AiReply;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

@SuppressWarnings("unchecked") // varargs of Map in the response helper
class ClaudeAssistantTest {

    private static final ChatResultItem CARD =
            new ChatResultItem("product", 9L, "Cà chua bi", "$1.10/kg · Vườn Út Hiền");

    private MessageService messageService;
    private AssistantTools tools;
    private ClaudeAssistant assistant;

    @BeforeEach
    void setUp() {
        AnthropicClient client = mock(AnthropicClient.class);
        messageService = mock(MessageService.class);
        when(client.messages()).thenReturn(messageService);
        @SuppressWarnings("unchecked")
        ObjectProvider<AnthropicClient> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(client);
        when(provider.getIfAvailable()).thenReturn(client);

        tools = mock(AssistantTools.class);
        // Sunday, 27/09/2026 Vietnam time
        Clock clock =
                Clock.fixed(Instant.parse("2026-09-27T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        assistant =
                new ClaudeAssistant(
                        provider,
                        new ChatbotAiProperties(
                                "key", "claude-haiku-4-5", 1024, 2, 10, 30, 60, 1500),
                        tools,
                        clock);
    }

    @Test
    void runsTheRequestedToolAndAnswersFromItsResult() {
        when(tools.run(any(), eq(AssistantTools.SEARCH_PRODUCTS), anyMap()))
                .thenReturn(
                        new ToolOutcome(
                                "{\"products\":[]}",
                                false,
                                ChatIntent.FIND_PRODUCT,
                                List.of(CARD)));
        when(messageService.create(any(MessageCreateParams.class)))
                .thenReturn(
                        toolUse("toolu_1", AssistantTools.SEARCH_PRODUCTS, "cà chua"),
                        text("Cà chua bi $1.10/kg ở Vườn Út Hiền."));

        AiReply reply =
                assistant.reply(
                        List.of(),
                        "tìm cà chua",
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        null);

        assertThat(reply.reply()).isEqualTo("Cà chua bi $1.10/kg ở Vườn Út Hiền.");
        assertThat(reply.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
        assertThat(reply.loggedIntent()).isEqualTo("AI:search_products");
        assertThat(reply.results()).containsExactly(CARD);
        // The context reaches the tool unchanged: this is what scopes a farmer tool to its stall.
        verify(tools)
                .run(
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        AssistantTools.SEARCH_PRODUCTS,
                        Map.of("keyword", "cà chua"));

        // The second request carries the assistant's tool_use turn and the matching tool_result
        List<MessageCreateParams> sent = sentParams(2);
        List<MessageParam> second = sent.get(1).messages();
        assertThat(second).hasSize(3);
        List<ContentBlockParam> results = second.get(2).content().asBlockParams();
        assertThat(results.getFirst().toolResult().orElseThrow().toolUseId()).isEqualTo("toolu_1");
    }

    @Test
    void theLastRoundForbidsToolsSoAnAnswerAlwaysComesBack() {
        when(tools.run(any(), any(), anyMap()))
                .thenReturn(new ToolOutcome("{}", false, ChatIntent.HELP, List.of()));
        when(messageService.create(any(MessageCreateParams.class)))
                .thenAnswer(
                        call -> {
                            MessageCreateParams params = call.getArgument(0);
                            return params.toolChoice().isPresent()
                                    ? text("Đây là câu trả lời.")
                                    : toolUse("toolu_x", AssistantTools.SEARCH_GUIDE, "x");
                        });

        AiReply reply =
                assistant.reply(
                        List.of(),
                        "làm sao để huỷ đơn",
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        null);

        assertThat(reply.reply()).isEqualTo("Đây là câu trả lời.");
        // maxToolRounds = 2 tool rounds, then one forced text round
        List<MessageCreateParams> sent = sentParams(3);
        assertThat(sent.get(0).toolChoice()).isEmpty();
        assertThat(sent.get(2).toolChoice().orElseThrow().isNone()).isTrue();
    }

    @Test
    void aToolErrorIsSentBackAsAnErrorResultAndDoesNotSetTheIntent() {
        when(tools.run(any(), any(), anyMap()))
                .thenReturn(
                        new ToolOutcome(
                                "{\"error\":\"No active market\"}",
                                true,
                                ChatIntent.FIND_PRODUCT,
                                List.of()));
        when(messageService.create(any(MessageCreateParams.class)))
                .thenReturn(
                        toolUse("toolu_1", AssistantTools.SEARCH_PRODUCTS, "cà chua"),
                        text("Không có chợ đó."));

        AiReply reply =
                assistant.reply(
                        List.of(),
                        "cà chua ở chợ X",
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        null);

        assertThat(reply.intent()).isEqualTo(ChatIntent.UNKNOWN);
        List<ContentBlockParam> results =
                sentParams(2).get(1).messages().get(2).content().asBlockParams();
        assertThat(results.getFirst().toolResult().orElseThrow().isError()).contains(true);
    }

    @Test
    void aRefusalGetsAFixedPoliteReply() {
        when(messageService.create(any(MessageCreateParams.class))).thenReturn(message("refusal"));

        AiReply reply =
                assistant.reply(
                        List.of(),
                        "…",
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        null);

        assertThat(reply.loggedIntent()).isEqualTo("AI:refusal");
        assertThat(reply.reply()).contains("Sorry");
    }

    @Test
    void anAnswerWithoutToolsIsLoggedAsNone() {
        when(messageService.create(any(MessageCreateParams.class))).thenReturn(text("Xin chào!"));

        AiReply reply =
                assistant.reply(
                        List.of(),
                        "xin chào",
                        new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                        null);

        assertThat(reply.intent()).isEqualTo(ChatIntent.UNKNOWN);
        assertThat(reply.loggedIntent()).isEqualTo("AI:none");
    }

    @Test
    void todaysDateAndWeekdayAreGivenToClaude() {
        when(messageService.create(any(MessageCreateParams.class))).thenReturn(text("ok"));

        assistant.reply(
                List.of(),
                "hôm nay chợ nào mở",
                new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                null);

        String system =
                sentParams(1).getFirst().system().orElseThrow().asTextBlockParams().get(1).text();
        assertThat(system)
                .contains("SUNDAY 27/09/2026 (day_of_week 0)")
                // "this Saturday" is looked up in the list, not computed by the model
                .contains("SATURDAY 03/10/2026 (day_of_week 6)");
    }

    @Test
    void historyStartsWithAUserMessage() {
        List<MessageParam> params =
                ClaudeAssistant.toParams(
                        List.of(
                                chat(ChatMessage.ROLE_BOT, "Xin chào"),
                                chat(ChatMessage.ROLE_USER, "tìm trứng"),
                                chat(ChatMessage.ROLE_BOT, "Có 2 sản phẩm")));

        assertThat(params)
                .extracting(MessageParam::role)
                .containsExactly(MessageParam.Role.USER, MessageParam.Role.ASSISTANT);
    }

    // ---------------------------------------------------------------- helpers

    private List<MessageCreateParams> sentParams(int calls) {
        ArgumentCaptor<MessageCreateParams> captor =
                ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(messageService, times(calls)).create(captor.capture());
        return captor.getAllValues();
    }

    private static Message toolUse(String id, String tool, String keyword) {
        String key = AssistantTools.SEARCH_GUIDE.equals(tool) ? "query" : "keyword";
        return message(
                "tool_use",
                Map.of("type", "tool_use", "id", id, "name", tool, "input", Map.of(key, keyword)));
    }

    private static Message text(String value) {
        return message("end_turn", Map.of("type", "text", "text", value));
    }

    /** A response shaped exactly like the Messages API JSON, parsed by the SDK's own mapper. */
    private static Message message(String stopReason, Map<String, Object>... content) {
        Map<String, Object> body =
                Map.of(
                        "id", "msg_test",
                        "type", "message",
                        "role", "assistant",
                        "model", "claude-haiku-4-5",
                        "content", List.of(content),
                        "stop_reason", stopReason,
                        "usage", Map.of("input_tokens", 10, "output_tokens", 10));
        try {
            return ObjectMappers.jsonMapper()
                    .readValue(ObjectMappers.jsonMapper().writeValueAsString(body), Message.class);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static ChatMessage chat(String role, String text) {
        return ChatMessage.builder().role(role).message(text).build();
    }

    // ------------------------------------------------- FR-093/094: what is on screen

    /** Every system block of one request, joined, so a test can assert what Claude was told. */
    private static List<com.anthropic.models.messages.TextBlockParam> systemBlocks(
            MessageCreateParams params) {
        return params.system().orElseThrow().asTextBlockParams();
    }

    private static String systemText(MessageCreateParams params) {
        return systemBlocks(params).stream()
                .map(TextBlockParam::text)
                .reduce("", (a, b) -> a + "\n" + b);
    }

    @Test
    void theScreenTheyAreOnIsPutInThePromptAndOnlyAfterTheCacheBreakpoint() {
        when(messageService.create(any(MessageCreateParams.class))).thenReturn(text("Rồi."));

        assistant.reply(
                List.of(),
                "đơn này sao rồi",
                new AssistantContext(AssistantAudience.FARMER, 7L, 9L),
                new PageContext("farmer/orders/:code", "order", "ML-1"));

        String system = systemText(sentParams(1).get(0));
        assertThat(system).contains("farmer/orders/:code").contains("looking at the order ML-1");
        // And it tells Claude to look the row up rather than answer from this line.
        assertThat(system).contains("never");
        // The stable prefix keeps its own block, so the per-request part cannot spoil the cache.
        assertThat(systemBlocks(sentParams(1).get(0))).hasSize(2);
    }

    @Test
    void noScreenMeansNothingIsAddedToThePrompt() {
        when(messageService.create(any(MessageCreateParams.class))).thenReturn(text("Rồi."));

        assistant.reply(
                List.of(),
                "xin chào",
                new AssistantContext(AssistantAudience.CUSTOMER, 7L, null),
                null);

        assertThat(systemText(sentParams(1).get(0))).doesNotContain("They are on the screen");
    }
}
