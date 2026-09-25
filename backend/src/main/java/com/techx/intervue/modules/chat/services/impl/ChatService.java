package com.techx.intervue.modules.chat.services.impl;

import com.techx.intervue.modules.chat.entities.ChatMessage;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.repositories.ChatKnowledgeRepository;
import com.techx.intervue.modules.chat.repositories.ChatMessageRepository;
import com.techx.intervue.modules.chat.requests.ChatRequest;
import com.techx.intervue.modules.chat.resources.ChatMessageResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ChatResultItem;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import com.techx.intervue.modules.chat.resources.ParsedMessage;
import com.techx.intervue.modules.chat.services.interfaces.ChatServiceInterface;
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
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService implements ChatServiceInterface {

    private static final String[] DAY_NAMES = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_LINES = 10;

    static final String GREETING_REPLY =
            "Hi, I am the MarketLink assistant. Ask me to find products, check prices and stock,"
                    + " market hours, which Farmers are at a market, or pickup times.";
    static final String HELP_REPLY =
            "You can ask, for example:\n"
                    + "• \"Find tomatoes\"\n"
                    + "• \"Tomato price\"\n"
                    + "• \"Ben Thanh market hours\"\n"
                    + "• \"Farmers at Ben Thanh market on Saturday\"\n"
                    + "• \"Pickup times for <stall name>\"";
    static final String FALLBACK_REPLY =
            "Sorry, I did not understand that. Type \"help\" to see what I can answer.";
    static final String DATA_UNAVAILABLE_REPLY =
            "Sorry, the market data is not available right now. Please try again later.";

    private final IntentClassifier classifier;
    private final ChatKnowledgeRepository knowledge;
    private final ChatMessageRepository messages;
    private final Clock clock;

    private record Answer(ChatIntent intent, String reply, List<ChatResultItem> results) {}

    @Override
    @Transactional
    public ChatReplyResource reply(ChatRequest request, Long userId) {
        ParsedMessage parsed = classifier.classify(request.message(), LocalDate.now(clock));

        Answer answer;
        try {
            answer = answer(parsed);
        } catch (DataAccessException e) {
            // Bảng nghiệp vụ chưa có hoặc DB lỗi: vẫn trả lời, không để lộ 500 ra UI
            log.warn("Chatbot lookup failed for intent {}", parsed.intent(), e);
            answer = new Answer(parsed.intent(), DATA_UNAVAILABLE_REPLY, List.of());
        }

        String intent = answer.intent().name();
        messages.save(
                message(
                        request.sessionKey(),
                        userId,
                        ChatMessage.ROLE_USER,
                        request.message(),
                        intent));
        messages.save(
                message(
                        request.sessionKey(),
                        userId,
                        ChatMessage.ROLE_BOT,
                        answer.reply(),
                        intent));

        return new ChatReplyResource(answer.reply(), answer.intent(), answer.results());
    }

    /**
     * sessionKey do client tự sinh và endpoint public, nên biết key không đủ để đọc lịch sử: user
     * đã đăng nhập chỉ thấy tin của chính mình, khách vãng lai chỉ thấy tin không gắn user nào
     * (R-06).
     */
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

    private Answer answer(ParsedMessage parsed) {
        return switch (parsed.intent()) {
            case GREETING -> new Answer(ChatIntent.GREETING, GREETING_REPLY, List.of());
            case HELP -> new Answer(ChatIntent.HELP, HELP_REPLY, List.of());
            case FIND_PRODUCT -> findProducts(parsed, false);
            case PRODUCT_DETAIL -> findProducts(parsed, true);
            case MARKET_HOURS -> marketHours(parsed);
            case FARMER_AVAILABILITY -> farmerAvailability(parsed);
            case PICKUP_WINDOW -> pickupWindow(parsed);
            case UNKNOWN -> unknown(parsed);
        };
    }

    // ---------------------------------------------------------------- sản phẩm

    private Answer findProducts(ParsedMessage parsed, boolean detail) {
        ChatIntent intent = detail ? ChatIntent.PRODUCT_DETAIL : ChatIntent.FIND_PRODUCT;
        MarketRow market = matchMarket(parsed.normalized());
        String keyword =
                market == null
                        ? parsed.keyword()
                        : removeWords(parsed.keyword(), coreName(market.marketName()));

        if (keyword.isBlank()) {
            return new Answer(
                    intent,
                    "What product are you looking for? For example: \"find tomatoes\".",
                    List.of());
        }

        List<ProductRow> products =
                knowledge.searchProducts(
                        keyword, market == null ? null : market.marketId(), detail);
        String where = market == null ? "" : " at " + market.marketName();
        if (products.isEmpty()) {
            return new Answer(
                    intent,
                    "No products found for \"" + keyword + "\"" + where + ". Try another keyword.",
                    List.of());
        }

        StringBuilder reply =
                new StringBuilder(
                        "Found "
                                + products.size()
                                + (products.size() == 1 ? " product" : " products")
                                + " for \""
                                + keyword
                                + "\""
                                + where
                                + ":");
        List<ChatResultItem> results = new ArrayList<>();
        for (ProductRow p : products) {
            String priceUnit = formatPrice(p.price()) + "/" + p.unit();
            String stock =
                    "sold_out".equals(p.status()) || p.stockQuantity() == 0
                            ? "sold out"
                            : p.stockQuantity() + " " + p.unit() + " left";
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

    private Answer unknown(ParsedMessage parsed) {
        // Câu không có từ kích hoạt, ví dụ chỉ gõ "bơ sáp": thử coi như tìm sản phẩm
        if (!parsed.keyword().isBlank()) {
            Answer attempt = findProducts(parsed, false);
            if (!attempt.results().isEmpty()) {
                return attempt;
            }
        }
        return new Answer(ChatIntent.UNKNOWN, FALLBACK_REPLY, List.of());
    }

    // ---------------------------------------------------------------- chợ

    private Answer marketHours(ParsedMessage parsed) {
        List<MarketRow> markets = knowledge.activeMarkets();
        if (markets.isEmpty()) {
            return new Answer(
                    ChatIntent.MARKET_HOURS, "No markets are open at the moment.", List.of());
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
                            ? "No markets open on " + DAY_NAMES[parsed.dayOfWeek()] + "."
                            : "Markets open on " + DAY_NAMES[parsed.dayOfWeek()] + ":";
        } else {
            shown = markets;
            heading = "Market hours:";
        }

        List<String> lines =
                shown.stream()
                        .map(
                                m ->
                                        m.marketName()
                                                + " ("
                                                + m.address()
                                                + ") opens "
                                                + formatRange(m.openingTime(), m.closingTime())
                                                + ", on "
                                                + formatDays(m.operatingDays())
                                                + ".")
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
        String reply = matched != null ? lines.getFirst() : joinLines(heading, lines);
        return new Answer(ChatIntent.MARKET_HOURS, reply, results);
    }

    // ---------------------------------------------------------------- farmer

    private Answer farmerAvailability(ParsedMessage parsed) {
        MarketRow market = matchMarket(parsed.normalized());
        Integer day = parsed.dayOfWeek();
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(null, market == null ? null : market.marketId(), day);

        String scope =
                (market == null ? "" : " at " + market.marketName())
                        + (day == null ? "" : " on " + DAY_NAMES[day]);
        if (schedules.isEmpty()) {
            return new Answer(
                    ChatIntent.FARMER_AVAILABILITY, "No Farmers" + scope + " yet.", List.of());
        }

        // Gộp lịch theo Farmer: "Vườn Xanh — Chợ A T7 06:00–10:00; Chợ B CN 07:00–11:00"
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
                                                                    + DAY_NAMES[r.dayOfWeek()]
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
                ChatIntent.FARMER_AVAILABILITY, joinLines("Farmers" + scope + ":", lines), results);
    }

    private Answer pickupWindow(ParsedMessage parsed) {
        FarmerRow farmer =
                matchByName(
                        parsed.normalized(),
                        knowledge.approvedFarmers(),
                        f -> coreName(f.stallName()));
        MarketRow market = matchMarket(parsed.normalized());
        if (farmer == null && market == null) {
            return new Answer(
                    ChatIntent.PICKUP_WINDOW,
                    "Which stall or market do you want pickup times for? For example: \"pickup times at Ben Thanh market\".",
                    List.of());
        }

        Integer day = parsed.dayOfWeek();
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(
                        farmer == null ? null : farmer.farmerId(),
                        market == null ? null : market.marketId(),
                        day);
        String scope =
                (farmer == null ? "" : " for " + farmer.stallName())
                        + (market == null ? "" : " at " + market.marketName())
                        + (day == null ? "" : " on " + DAY_NAMES[day]);
        if (schedules.isEmpty()) {
            return new Answer(
                    ChatIntent.PICKUP_WINDOW, "No pickup times" + scope + " yet.", List.of());
        }

        List<String> lines =
                schedules.stream()
                        .map(
                                r ->
                                        DAY_NAMES[r.dayOfWeek()]
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
                joinLines("Pickup times" + scope + ":", lines)
                        + "\nNote: you can edit or cancel an order only before the Farmer's cutoff.",
                results);
    }

    // ---------------------------------------------------------------- tiện ích

    private MarketRow matchMarket(String normalized) {
        return matchByName(normalized, knowledge.activeMarkets(), m -> coreName(m.marketName()));
    }

    /** Tên dài nhất xuất hiện nguyên cụm trong câu đã bỏ dấu, null nếu không có. */
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

    /** "Chợ Bến Thành" → "ben thanh"; "Sạp Cô Ba" → "co ba" — người dùng hay bỏ tiền tố. */
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

    private static String formatPrice(BigDecimal price) {
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.US);
        return format.format(price) + " ₫";
    }

    private static String formatRange(LocalTime start, LocalTime end) {
        return TIME.format(start) + "–" + TIME.format(end);
    }

    private static String formatDays(List<Integer> days) {
        if (days.isEmpty()) {
            return "(not set yet)";
        }
        return days.stream().map(d -> DAY_NAMES[d]).collect(Collectors.joining(", "));
    }

    private static String joinLines(String heading, List<String> lines) {
        StringBuilder text = new StringBuilder(heading);
        lines.stream().limit(MAX_LINES).forEach(line -> text.append("\n• ").append(line));
        if (lines.size() > MAX_LINES) {
            text.append("\n… and ").append(lines.size() - MAX_LINES).append(" more.");
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
}
