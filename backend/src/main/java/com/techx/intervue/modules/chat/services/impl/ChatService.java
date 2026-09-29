package com.techx.intervue.modules.chat.services.impl;

import com.techx.intervue.modules.chat.ChatbotAiProperties;
import com.techx.intervue.modules.chat.entities.ChatMessage;
import com.techx.intervue.modules.chat.enums.AssistantAudience;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.repositories.ChatKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.ChatMessageRepository;
import com.techx.intervue.modules.chat.repositories.FarmerKnowledgeRepository;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.AssistantContext;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ChatResultItem;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ProposedAction;
import com.techx.intervue.modules.chat.resources.FarmerBriefingResource;
import com.techx.intervue.modules.chat.resources.FarmerRows.BriefingRow;
import com.techx.intervue.modules.chat.resources.FarmerRows.ScheduleDayRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import com.techx.intervue.modules.chat.resources.ParsedMessage;
import com.techx.intervue.modules.chat.services.impl.ClaudeAssistant.AiReply;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService implements ChatServiceInterface {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_LINES = 10;

    private final IntentClassifier classifier;
    private final ChatKnowledgeRepository knowledge;
    private final ChatMessageRepository messages;
    private final Clock clock;
    private final ProductAvailabilityResolver availability;
    private final ClaudeAssistant assistant;
    private final AssistantRateLimiter assistantLimit;
    private final FarmerKnowledgeRepository farmerKnowledge;
    private final ChatbotAiProperties aiProperties;

    private record Answer(ChatIntent intent, String reply, List<ChatResultItem> results) {}

    @Override
    public ChatReplyResource reply(ChatRequest request, Long userId, AssistantAudience audience) {
        Answer answer = null;
        String loggedIntent = null;
        List<ProposedAction> actions = List.of();

        if (audience != null && userId != null && assistant.enabled()) {
            AiReply ai = askAssistant(request, userId, audience);
            if (ai != null) {
                answer = new Answer(ai.intent(), ai.reply(), ai.results());
                loggedIntent = ai.loggedIntent();
                actions = ai.actions();
            }
        }
        if (answer == null) {
            answer = keywordAnswer(request.message());
            loggedIntent = answer.intent().name();
        }

        messages.saveAll(
                List.of(
                        message(
                                request.sessionKey(),
                                userId,
                                ChatMessage.ROLE_USER,
                                request.message(),
                                loggedIntent),
                        message(
                                request.sessionKey(),
                                userId,
                                ChatMessage.ROLE_BOT,
                                answer.reply(),
                                loggedIntent)));

        return new ChatReplyResource(answer.reply(), answer.intent(), answer.results(), actions);
    }

    private AiReply askAssistant(ChatRequest request, Long userId, AssistantAudience audience) {
        if (!assistantLimit.tryAcquirePlatform()) {
            log.info("Assistant daily platform cap reached, keyword engine answers");
            return null;
        }
        if (!assistantLimit.tryAcquire(userId, audience)) {
            log.info("Assistant hourly cap reached for user {}, keyword engine answers", userId);
            return null;
        }
        try {
            return assistant.reply(
                    recentHistory(request.sessionKey(), userId),
                    request.message(),
                    contextFor(userId, audience, request.context()),
                    request.context());
        } catch (RuntimeException e) {
            log.warn("Assistant failed, keyword engine answers: {}", e.toString());
            return null;
        }
    }

    private AssistantContext contextFor(
            Long userId, AssistantAudience audience, ChatRequest.PageContext page) {
        Long farmerId =
                audience == AssistantAudience.FARMER
                        ? farmerKnowledge.farmerIdOf(userId).orElse(null)
                        : null;
        List<ChatRequest.PageContext.CartLine> cart =
                page == null || page.cart() == null ? List.of() : page.cart();
        return new AssistantContext(audience, userId, farmerId, cart);
    }

    private List<ChatMessage> recentHistory(String sessionKey, Long userId) {
        List<ChatMessage> mine =
                messages.findTop50BySessionKeyOrderByIdDesc(sessionKey).stream()
                        .filter(m -> Objects.equals(m.getUserId(), userId))
                        .limit(Math.max(0, aiProperties.historyMessages()))
                        .collect(Collectors.toCollection(ArrayList::new));
        java.util.Collections.reverse(mine);
        return mine;
    }

    private Answer keywordAnswer(String text) {
        ParsedMessage parsed = classifier.classify(text, LocalDate.now(clock));
        KeywordCopy copy = KeywordCopy.forQuestion(parsed.vietnamese());
        try {
            return answer(parsed, copy);
        } catch (DataAccessException e) {
            log.warn("Chatbot lookup failed for intent {}", parsed.intent(), e);
            return new Answer(parsed.intent(), copy.dataUnavailable(), List.of());
        }
    }

    @Override
    public List<ChatMessageResource> history(String sessionKey, Long userId) {
        List<ChatMessage> latest =
                new ArrayList<>(messages.findTop50BySessionKeyOrderByIdDesc(sessionKey));
        java.util.Collections.reverse(latest);
        return latest.stream()
                .filter(m -> Objects.equals(m.getUserId(), userId))
                .map(
                        m ->
                                new ChatMessageResource(
                                        m.getRole(),
                                        m.getMessage(),
                                        m.getIntent(),
                                        m.getCreatedAt()))
                .toList();
    }

    private Answer answer(ParsedMessage parsed, KeywordCopy copy) {
        return switch (parsed.intent()) {
            case GREETING -> new Answer(ChatIntent.GREETING, copy.greeting(), List.of());
            case HELP -> new Answer(ChatIntent.HELP, copy.help(), List.of());
            case FIND_PRODUCT -> findProducts(parsed, false, copy);
            case PRODUCT_DETAIL -> findProducts(parsed, true, copy);
            case MARKET_HOURS -> marketHours(parsed, copy);
            case FARMER_AVAILABILITY -> farmerAvailability(parsed, copy);
            case PICKUP_WINDOW -> pickupWindow(parsed, copy);
            case UNKNOWN -> unknown(parsed, copy);
        };
    }

    private Answer findProducts(ParsedMessage parsed, boolean detail, KeywordCopy copy) {
        ChatIntent intent = detail ? ChatIntent.PRODUCT_DETAIL : ChatIntent.FIND_PRODUCT;
        MarketRow market = matchMarket(parsed.normalized());
        String keyword =
                market == null
                        ? parsed.keyword()
                        : removeWords(parsed.keyword(), coreName(market.marketName()));

        if (keyword.isBlank()) {
            return new Answer(intent, copy.askProduct(), List.of());
        }

        List<ProductRow> products =
                knowledge.searchProducts(
                        keyword, market == null ? null : market.marketId(), detail);
        String where = market == null ? "" : copy.at(market.marketName());
        if (products.isEmpty()) {
            return new Answer(intent, copy.noProducts(keyword, where), List.of());
        }

        StringBuilder reply = new StringBuilder(copy.found(products.size(), keyword, where));
        Map<Long, ProductAvailabilityResolver.Availability> resolved =
                availability.resolve(
                        products.stream()
                                .collect(
                                        Collectors.toMap(
                                                ProductRow::productId,
                                                ProductRow::price,
                                                (a, b) -> a)));
        List<ChatResultItem> results = new ArrayList<>();
        for (ProductRow p : products) {
            ProductAvailabilityResolver.Availability a = resolved.get(p.productId());
            int left = a == null ? 0 : a.quantity();
            String unit = copy.unit(p.unit());
            String priceUnit = formatPrice(a == null ? p.price() : a.price()) + "/" + unit;
            String stock =
                    "sold_out".equals(p.status()) || left == 0
                            ? copy.soldOut()
                            : copy.left(left, unit);
            String markets =
                    p.marketNames().isEmpty()
                            ? ""
                            : " (" + String.join(", ", p.marketNames()) + ")";
            reply.append("\n• ").append(p.name()).append(" — ").append(priceUnit);
            if (detail) {
                reply.append(", ").append(stock);
            }
            reply.append(" · ").append(p.stallName()).append(markets);
            results.add(
                    new ChatResultItem(
                            "product", p.productId(), p.name(), priceUnit + " · " + p.stallName()));
        }
        return new Answer(intent, reply.toString(), results);
    }

    private Answer unknown(ParsedMessage parsed, KeywordCopy copy) {
        if (!parsed.keyword().isBlank()) {
            Answer attempt = findProducts(parsed, false, copy);
            if (!attempt.results().isEmpty()) {
                return attempt;
            }
        }
        return new Answer(ChatIntent.UNKNOWN, copy.fallback(), List.of());
    }

    private Answer marketHours(ParsedMessage parsed, KeywordCopy copy) {
        List<MarketRow> markets = knowledge.activeMarkets();
        if (markets.isEmpty()) {
            return new Answer(ChatIntent.MARKET_HOURS, copy.noMarketsOpen(), List.of());
        }

        MarketRow matched =
                matchByName(parsed.normalized(), markets, m -> coreName(m.marketName()));
        List<MarketRow> shown;
        String heading;
        if (matched != null) {
            shown = List.of(matched);
            heading = "";
        } else if (parsed.dayOfWeek() != null) {
            shown =
                    markets.stream()
                            .filter(m -> m.operatingDays().contains(parsed.dayOfWeek()))
                            .toList();
            heading =
                    shown.isEmpty()
                            ? copy.noMarketsOn(parsed.dayOfWeek())
                            : copy.marketsOn(parsed.dayOfWeek());
        } else {
            shown = markets;
            heading = copy.marketHours();
        }

        List<String> lines =
                shown.stream()
                        .map(
                                m ->
                                        copy.marketLine(
                                                m.marketName(),
                                                m.address(),
                                                formatRange(m.openingTime(), m.closingTime()),
                                                formatDays(m.operatingDays(), copy)))
                        .toList();
        List<ChatResultItem> results =
                shown.stream()
                        .map(
                                m ->
                                        new ChatResultItem(
                                                "market",
                                                m.marketId(),
                                                m.marketName(),
                                                m.address()))
                        .toList();
        String reply = matched != null ? lines.getFirst() : joinLines(heading, lines, copy);
        return new Answer(ChatIntent.MARKET_HOURS, reply, results);
    }

    private Answer farmerAvailability(ParsedMessage parsed, KeywordCopy copy) {
        MarketRow market = matchMarket(parsed.normalized());
        Integer day = parsed.dayOfWeek();
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(null, market == null ? null : market.marketId(), day);

        String scope =
                (market == null ? "" : copy.at(market.marketName()))
                        + (day == null ? "" : copy.on(day));
        if (schedules.isEmpty()) {
            return new Answer(ChatIntent.FARMER_AVAILABILITY, copy.noFarmers(scope), List.of());
        }

        Map<Long, List<ScheduleRow>> byFarmer =
                schedules.stream()
                        .collect(
                                Collectors.groupingBy(
                                        ScheduleRow::farmerId,
                                        LinkedHashMap::new,
                                        Collectors.toList()));
        List<String> lines = new ArrayList<>();
        List<ChatResultItem> results = new ArrayList<>();
        byFarmer.values()
                .forEach(
                        rows -> {
                            ScheduleRow first = rows.getFirst();
                            String slots =
                                    rows.stream()
                                            .map(
                                                    r ->
                                                            r.marketName()
                                                                    + " "
                                                                    + copy.day(r.dayOfWeek())
                                                                    + " "
                                                                    + formatRange(
                                                                            r.pickupStart(),
                                                                            r.pickupEnd()))
                                            .collect(Collectors.joining("; "));
                            lines.add(first.stallName() + " — " + slots);
                            results.add(
                                    new ChatResultItem(
                                            "farmer",
                                            first.farmerId(),
                                            first.stallName(),
                                            first.marketName()));
                        });
        return new Answer(
                ChatIntent.FARMER_AVAILABILITY,
                joinLines(copy.farmers(scope), lines, copy),
                results);
    }

    private Answer pickupWindow(ParsedMessage parsed, KeywordCopy copy) {
        FarmerRow farmer =
                matchByName(
                        parsed.normalized(),
                        knowledge.approvedFarmers(),
                        f -> coreName(f.stallName()));
        MarketRow market = matchMarket(parsed.normalized());
        if (farmer == null && market == null) {
            return new Answer(ChatIntent.PICKUP_WINDOW, copy.askPickup(), List.of());
        }

        Integer day = parsed.dayOfWeek();
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(
                        farmer == null ? null : farmer.farmerId(),
                        market == null ? null : market.marketId(),
                        day);
        String scope =
                (farmer == null ? "" : copy.forStall(farmer.stallName()))
                        + (market == null ? "" : copy.at(market.marketName()))
                        + (day == null ? "" : copy.on(day));
        if (schedules.isEmpty()) {
            return new Answer(ChatIntent.PICKUP_WINDOW, copy.noPickup(scope), List.of());
        }

        List<String> lines =
                schedules.stream()
                        .map(
                                r ->
                                        copy.day(r.dayOfWeek())
                                                + " · "
                                                + (farmer == null ? r.stallName() + " · " : "")
                                                + r.marketName()
                                                + " · "
                                                + formatRange(r.pickupStart(), r.pickupEnd()))
                        .toList();
        List<ChatResultItem> results =
                farmer != null
                        ? List.of(
                                new ChatResultItem(
                                        "farmer", farmer.farmerId(), farmer.stallName(), null))
                        : List.of(
                                new ChatResultItem(
                                        "market",
                                        market.marketId(),
                                        market.marketName(),
                                        market.address()));
        return new Answer(
                ChatIntent.PICKUP_WINDOW,
                joinLines(copy.pickup(scope), lines, copy) + copy.cutoffNote(),
                results);
    }

    private MarketRow matchMarket(String normalized) {
        return matchByName(normalized, knowledge.activeMarkets(), m -> coreName(m.marketName()));
    }

    static <T> T matchByName(String normalized, List<T> candidates, Function<T, String> name) {
        String padded = " " + normalized + " ";
        T best = null;
        int bestLength = 0;
        for (T candidate : candidates) {
            String core = name.apply(candidate);
            if (!core.isEmpty()
                    && core.length() > bestLength
                    && padded.contains(" " + core + " ")) {
                best = candidate;
                bestLength = core.length();
            }
        }
        return best;
    }

    static String coreName(String name) {
        String normalized = TextNormalizer.normalize(name);
        for (String prefix : List.of("cho ", "sap ", "market ")) {
            if (normalized.startsWith(prefix) && normalized.length() > prefix.length()) {
                return normalized.substring(prefix.length());
            }
        }
        return normalized;
    }

    private static String removeWords(String keyword, String phrase) {
        return (" " + keyword + " ")
                .replace(" " + phrase + " ", " ")
                .trim()
                .replaceAll("\\s+", " ");
    }

    static String formatPrice(BigDecimal price) {
        return NumberFormat.getCurrencyInstance(Locale.US).format(price);
    }

    private static String formatRange(LocalTime start, LocalTime end) {
        return TIME.format(start) + "–" + TIME.format(end);
    }

    private static String formatDays(List<Integer> days, KeywordCopy copy) {
        if (days.isEmpty()) {
            return copy.notSetYet();
        }
        return days.stream().map(copy::day).collect(Collectors.joining(", "));
    }

    private static String joinLines(String heading, List<String> lines, KeywordCopy copy) {
        StringBuilder text = new StringBuilder(heading);
        lines.stream().limit(MAX_LINES).forEach(line -> text.append("\n• ").append(line));
        if (lines.size() > MAX_LINES) {
            text.append(copy.more(lines.size() - MAX_LINES));
        }
        return text.toString();
    }

    private static ChatMessage message(
            String sessionKey, Long userId, String role, String text, String intent) {
        return ChatMessage.builder()
                .sessionKey(sessionKey)
                .userId(userId)
                .role(role)
                .message(text)
                .intent(intent)
                .build();
    }

    private static final int BRIEFING_LOW_STOCK = 5;

    @Override
    public FarmerBriefingResource farmerBriefing(Long userId) {
        Long farmerId = userId == null ? null : farmerKnowledge.farmerIdOf(userId).orElse(null);
        if (farmerId == null) {
            return new FarmerBriefingResource(List.of(), 0, 0, 0, 0, 0);
        }
        LocalDate today = LocalDate.now(clock);
        int dayOfWeek = today.getDayOfWeek().getValue() % 7;
        List<String> markets =
                farmerKnowledge.mySchedule(farmerId).stream()
                        .filter(day -> day.dayOfWeek() == dayOfWeek)
                        .map(ScheduleDayRow::marketName)
                        .distinct()
                        .toList();
        BriefingRow row = farmerKnowledge.briefing(farmerId, today, BRIEFING_LOW_STOCK);
        return new FarmerBriefingResource(
                markets,
                row.ordersToday(),
                row.waitingToBeAccepted(),
                row.cutoffAlreadyPassed(),
                row.soldOutProducts(),
                row.lowStockProducts());
    }
}
