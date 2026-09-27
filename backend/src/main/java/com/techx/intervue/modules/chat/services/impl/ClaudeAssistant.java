package com.techx.intervue.modules.chat.services.impl;

import com.anthropic.client.AnthropicClient;
import com.anthropic.models.messages.CacheControlEphemeral;
import com.anthropic.models.messages.ContentBlock;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.TextBlockParam;
import com.anthropic.models.messages.ToolChoiceNone;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.techx.intervue.modules.chat.ChatbotAiProperties;
import com.techx.intervue.modules.chat.entities.ChatMessage;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.requests.ChatRequest.PageContext;
import com.techx.intervue.modules.chat.resources.AssistantContext;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ChatResultItem;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ProposedAction;
import com.techx.intervue.modules.chat.services.impl.AssistantTools.ToolOutcome;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

/**
 * FR-090/091 with Claude: a manual tool-use loop. Claude reads the question, calls the read-only
 * tools in {@link AssistantTools} (catalogue lookups and the user-guide search that grounds how-to
 * answers), and writes the reply from what they return. The loop is bounded by {@code
 * maxToolRounds}; the last round forbids tools so a text answer always comes back.
 *
 * <p>Errors from the Claude API are not handled here: they propagate to {@link ChatService}, which
 * falls back to the keyword engine.
 */
@Slf4j
@Service
public class ClaudeAssistant {

    /** Tool names joined for the chat_messages.intent column (VARCHAR 50), prefixed "AI:". */
    private static final int INTENT_COLUMN = 50;

    private static final String REFUSAL_REPLY =
            "Sorry, I cannot help with that. Ask me about products, markets, stalls, pickup times"
                    + " or how to use MarketLink.";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * Stable across requests so it can be cached together with the tool list. Anything that changes
     * per request (today's date) goes in a second block after the cache breakpoint.
     */
    static final String SYSTEM_PROMPT =
            """
            You are the MarketLink assistant. MarketLink lets customers in Ho Chi Minh City \
            reserve fresh produce from Farmers' stalls at weekly markets and collect it at the \
            stall. There is no delivery and no online payment: the customer pays the Farmer at \
            the stall on pickup.

            How to answer:
            - Products, prices, stock, markets, opening hours, which stalls are where, pickup \
            windows: always call a tool and answer only from its result. Never guess a product, \
            price, time or name. If a tool returns nothing, say so and suggest another keyword, \
            market or day.
            - How to use the website (account, password, cart, placing, editing or cancelling an \
            order, cutoff, payment, reviews, favorites, notifications, messages, settings, \
            selling): call search_user_guide and answer only from the sections it returns. If \
            they do not cover the question, say you do not know and suggest the Feedback page.
            - "Today", "tomorrow", "this Saturday": convert to day_of_week (0 = Sunday … \
            6 = Saturday) using today's date given below.
            - You never change anything on your own. Where you can offer an action, it is a \
            button the person has to press, and you say so.
            - Politely decline anything unrelated to MarketLink.

            Style:
            - Reply in the language the user writes in (usually Vietnamese).
            - Be short: at most about 8 lines. Plain text only, no markdown headings, tables or \
            bold; use "• " for lists.
            - Write prices in US dollars with two decimals, e.g. $1.50/kg. Times in 24h \
            (06:30). Dates as dd/MM/yyyy, taken from the day list below, never computed.
            - Units in Vietnamese: bunch = bó, kg = kg, jar = hũ, litre = lít, loaf = ổ, \
            piece = cái, bag = túi.
            - Result cards with links are shown under your reply, so do not paste URLs.
            """;

    /**
     * Appended to the cached system prefix, so each audience gets its own cache entry. Kept short:
     * the tool list already tells Claude what it can do, this says who it is talking to.
     */
    private static final Map<AssistantAudience, String> AUDIENCE_PROMPT =
            Map.of(
                    AssistantAudience.CUSTOMER,
                    """

                    You are talking to a customer: someone who reserves produce and collects it \
                    at the stall. You cannot place, change or cancel their orders, and you cannot \
                    see their orders or account; point them to the right page (My orders, \
                    Account, Settings) instead.
                    """,
                    AssistantAudience.FARMER,
                    """

                    You are talking to a Farmer: someone who runs a stall and sells on \
                    MarketLink. Questions about "my orders", "my products", "my stall" mean \
                    theirs. When the guide explains something a Farmer does, answer from the \
                    Farmer sections, not the customer ones.

                    You may offer to accept, decline, mark ready or mark completed one of their \
                    orders with propose_order_action. That call changes nothing: it checks the \
                    order is theirs and the change is possible right now, and the client shows a \
                    button. Always end such a reply by saying they still have to press it. If the \
                    tool comes back with an error, tell them why and do not offer the button.
                    """,
                    AssistantAudience.ADMIN,
                    """

                    You are talking to a MarketLink administrator. Questions about approvals, \
                    moderation, accounts, markets, categories, announcements and platform \
                    reports are about running the platform, not about shopping. When the guide \
                    explains something, answer from the admin sections.

                    Writing a platform announcement (FR-077) is the one thing you write rather \
                    than look up. Asked for one, call search_user_guide for the announcement \
                    sections first and follow the voice rules there exactly, then give a headline \
                    (at most 150 characters) and a body (at most 1000), ready to paste, and \
                    nothing else around them. Translate it only when asked, and then keep market, \
                    stall and people names, every number, date and time, and the word Farmer \
                    unchanged.

                    You may offer to approve, reject or suspend one stall with \
                    propose_farmer_decision, after looking the stall up with \
                    get_farmer_applications. That call changes nothing: the client shows a button \
                    the admin has to press. Always say so.
                    """);

    private final ObjectProvider<AnthropicClient> client;
    private final ChatbotAiProperties properties;
    private final AssistantTools tools;
    private final Clock clock;

    public ClaudeAssistant(
            ObjectProvider<AnthropicClient> client,
            ChatbotAiProperties properties,
            AssistantTools tools,
            Clock clock) {
        this.client = client;
        this.properties = properties;
        this.tools = tools;
        this.clock = clock;
    }

    /**
     * @param reply the text shown to the user
     * @param intent FR-092 intent of the first tool called, UNKNOWN when none was needed
     * @param loggedIntent what is stored in chat_messages.intent, e.g. "AI:search_products"
     * @param results result cards from every tool call, deduplicated
     */
    public record AiReply(
            String reply,
            ChatIntent intent,
            String loggedIntent,
            List<ChatResultItem> results,
            List<ProposedAction> actions) {

        public AiReply(
                String reply,
                ChatIntent intent,
                String loggedIntent,
                List<ChatResultItem> results) {
            this(reply, intent, loggedIntent, results, List.of());
        }
    }

    public boolean enabled() {
        return properties.enabled() && client.getIfAvailable() != null;
    }

    /**
     * Answers one user message.
     *
     * @param history earlier messages of this session and account, oldest first
     */
    public AiReply reply(
            List<ChatMessage> history,
            String userMessage,
            AssistantContext context,
            PageContext page) {
        AssistantAudience audience = context.audience();
        AnthropicClient anthropic = client.getObject();
        List<MessageParam> conversation = new ArrayList<>(toParams(history));
        conversation.add(text(MessageParam.Role.USER, userMessage));

        Set<String> toolsUsed = new LinkedHashSet<>();
        ChatIntent intent = null;
        Map<String, ChatResultItem> cards = new LinkedHashMap<>();
        Map<String, ProposedAction> actions = new LinkedHashMap<>();

        int rounds = Math.max(1, properties.maxToolRounds());
        for (int round = 0; round <= rounds; round++) {
            boolean lastRound = round == rounds;
            Message response =
                    anthropic.messages().create(params(conversation, lastRound, audience, page));
            StopReason stop = response.stopReason().orElse(StopReason.END_TURN);

            if (StopReason.REFUSAL.equals(stop)) {
                return new AiReply(REFUSAL_REPLY, ChatIntent.UNKNOWN, "AI:refusal", List.of());
            }
            if (!StopReason.TOOL_USE.equals(stop)) {
                return new AiReply(
                        textOf(response),
                        intent == null ? ChatIntent.UNKNOWN : intent,
                        loggedIntent(toolsUsed),
                        List.copyOf(cards.values()),
                        List.copyOf(actions.values()));
            }

            // Keep the whole assistant turn (text + tool_use blocks), then answer every tool_use
            // in a single user message
            conversation.add(response.toParam());
            List<ContentBlockParam> results = new ArrayList<>();
            for (ContentBlock block : response.content()) {
                Optional<ToolUseBlock> call = block.toolUse();
                if (call.isEmpty()) {
                    continue;
                }
                ToolUseBlock use = call.get();
                Map<String, Object> input = inputOf(use);
                ToolOutcome outcome = tools.run(context, use.name(), input);
                log.debug("Assistant tool {} {} → error={}", use.name(), input, outcome.error());

                toolsUsed.add(use.name());
                if (intent == null && !outcome.error()) {
                    intent = outcome.intent();
                }
                outcome.cards().forEach(c -> cards.putIfAbsent(c.type() + ":" + c.id(), c));
                outcome.actions().forEach(a -> actions.putIfAbsent(a.action() + ":" + a.id(), a));
                results.add(
                        ContentBlockParam.ofToolResult(
                                ToolResultBlockParam.builder()
                                        .toolUseId(use.id())
                                        .content(outcome.content())
                                        .isError(outcome.error())
                                        .build()));
            }
            conversation.add(
                    MessageParam.builder()
                            .role(MessageParam.Role.USER)
                            .contentOfBlockParams(results)
                            .build());
        }
        // Unreachable: the last round forbids tools, so it always ends with text
        throw new IllegalStateException("Assistant loop ended without a reply");
    }

    private MessageCreateParams params(
            List<MessageParam> conversation,
            boolean lastRound,
            AssistantAudience audience,
            PageContext page) {
        MessageCreateParams.Builder builder =
                MessageCreateParams.builder()
                        .model(properties.model())
                        .maxTokens(properties.maxTokens())
                        .systemOfTextBlockParams(
                                List.of(
                                        TextBlockParam.builder()
                                                .text(SYSTEM_PROMPT + AUDIENCE_PROMPT.get(audience))
                                                .cacheControl(
                                                        CacheControlEphemeral.builder().build())
                                                .build(),
                                        TextBlockParam.builder()
                                                .text(today() + onScreen(page))
                                                .build()))
                        .messages(conversation);
        AssistantTools.definitionsFor(audience).forEach(builder::addTool);
        if (lastRound) {
            // Out of tool rounds: the tools stay declared (earlier tool_use blocks refer to them)
            // but Claude must now answer with what it has
            builder.toolChoice(ToolChoiceNone.builder().build());
        }
        return builder.build();
    }

    /**
     * Today plus the dates of the next 7 days, so "this Saturday" is looked up rather than
     * computed: the model gets calendar arithmetic wrong.
     */
    String today() {
        LocalDate date = LocalDate.now(clock);
        StringBuilder text =
                new StringBuilder("Today is ")
                        .append(dayLine(date))
                        .append(", time zone Asia/Ho_Chi_Minh. Coming days:");
        for (int i = 1; i <= 7; i++) {
            text.append(i == 1 ? " " : "; ").append(dayLine(date.plusDays(i)));
        }
        return text.append('.').toString();
    }

    private static String dayLine(LocalDate date) {
        return date.getDayOfWeek()
                + " "
                + DATE.format(date)
                + " (day_of_week "
                + date.getDayOfWeek().getValue() % 7
                + ")";
    }

    /**
     * Stored history → Claude messages. The API needs the first message to come from the user, so a
     * leading bot message (a greeting) is dropped; consecutive same-role messages are allowed.
     */
    static List<MessageParam> toParams(List<ChatMessage> history) {
        List<MessageParam> out = new ArrayList<>();
        for (ChatMessage m : history) {
            boolean user = ChatMessage.ROLE_USER.equals(m.getRole());
            if (out.isEmpty() && !user) {
                continue;
            }
            out.add(
                    text(
                            user ? MessageParam.Role.USER : MessageParam.Role.ASSISTANT,
                            m.getMessage()));
        }
        return out;
    }

    private static MessageParam text(MessageParam.Role role, String content) {
        return MessageParam.builder().role(role).content(content).build();
    }

    @SuppressWarnings("unchecked") // tool input is always a JSON object
    private static Map<String, Object> inputOf(ToolUseBlock use) {
        Map<String, Object> input = use._input().convert(Map.class);
        return input == null ? Map.of() : input;
    }

    private static String textOf(Message response) {
        StringBuilder text = new StringBuilder();
        response.content().stream()
                .flatMap(block -> block.text().stream())
                .forEach(t -> text.append(t.text()));
        String reply = text.toString().strip();
        return reply.isEmpty() ? REFUSAL_REPLY : reply;
    }

    private static String loggedIntent(Set<String> toolsUsed) {
        String value = "AI:" + (toolsUsed.isEmpty() ? "none" : String.join("+", toolsUsed));
        return value.length() <= INTENT_COLUMN ? value : value.substring(0, INTENT_COLUMN);
    }

    /**
     * What the person is looking at, appended after the cache breakpoint because it changes per
     * request. Only shaped values reach this: a route pattern and a record reference, both
     * validated on the request. There is nothing here a person could have typed.
     */
    private static String onScreen(PageContext page) {
        if (page == null || page.page() == null || page.page().isBlank()) {
            return "";
        }
        StringBuilder text =
                new StringBuilder("\n\nThey are on the screen \"").append(page.page()).append("\"");
        if (page.recordType() != null && page.recordRef() != null) {
            text.append(", looking at the ")
                    .append(page.recordType())
                    .append(" ")
                    .append(page.recordRef());
        }
        text.append(
                ". If they say \"this order\", \"this stall\" or anything else without naming it, that"
                        + " is what they mean. Look it up with a tool before answering; never"
                        + " describe it from this line alone.");
        return text.toString();
    }
}
