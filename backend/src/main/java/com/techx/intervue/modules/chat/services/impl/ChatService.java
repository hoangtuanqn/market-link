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

    private static final String[] DAY_NAMES = {"CN", "T2", "T3", "T4", "T5", "T6", "T7"};
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final int MAX_LINES = 10;

    static final String GREETING_REPLY =
            "Xin chào! Mình là trợ lý MarketLink. Bạn có thể hỏi mình: tìm sản phẩm, giá và tồn"
                    + " kho, giờ họp chợ, Farmer nào có mặt, hoặc khung giờ nhận hàng.";
    static final String HELP_REPLY =
            "Bạn có thể hỏi, ví dụ:\n"
                    + "• \"Tìm cà chua\"\n"
                    + "• \"Cà chua giá bao nhiêu?\"\n"
                    + "• \"Chợ Bến Thành mở cửa mấy giờ?\"\n"
                    + "• \"Thứ 7 có Farmer nào ở chợ Bến Thành?\"\n"
                    + "• \"Khung giờ lấy hàng của <tên stall>\"";
    static final String FALLBACK_REPLY =
            "Xin lỗi, mình chưa hiểu câu hỏi. Gõ \"giúp\" để xem các câu mình trả lời được.";
    static final String DATA_UNAVAILABLE_REPLY =
            "Xin lỗi, dữ liệu tra cứu đang chưa sẵn sàng. Bạn thử lại sau nhé.";

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

    @Override
    public List<ChatMessageResource> history(String sessionKey) {
        List<ChatMessage> latest =
                new ArrayList<>(messages.findTop50BySessionKeyOrderByIdDesc(sessionKey));
        java.util.Collections.reverse(latest);
        return latest.stream()
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
                    intent, "Bạn muốn tìm sản phẩm gì? Ví dụ: \"tìm cà chua\".", List.of());
        }

        List<ProductRow> products =
                knowledge.searchProducts(
                        keyword, market == null ? null : market.marketId(), detail);
        String where = market == null ? "" : " tại " + market.marketName();
        if (products.isEmpty()) {
            return new Answer(
                    intent,
                    "Mình chưa tìm thấy sản phẩm nào khớp \""
                            + keyword
                            + "\""
                            + where
                            + ". Bạn thử từ khoá khác nhé.",
                    List.of());
        }

        StringBuilder reply =
                new StringBuilder(
                        "Tìm thấy "
                                + products.size()
                                + " sản phẩm cho \""
                                + keyword
                                + "\""
                                + where
                                + ":");
        List<ChatResultItem> results = new ArrayList<>();
        for (ProductRow p : products) {
            String priceUnit = formatPrice(p.price()) + "/" + p.unit();
            String stock =
                    "sold_out".equals(p.status()) || p.stockQuantity() == 0
                            ? "tạm hết hàng"
                            : "còn " + p.stockQuantity() + " " + p.unit();
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
                    ChatIntent.MARKET_HOURS, "Hiện chưa có chợ nào đang hoạt động.", List.of());
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
                            ? "Không có chợ nào họp vào " + DAY_NAMES[parsed.dayOfWeek()] + "."
                            : "Các chợ họp vào " + DAY_NAMES[parsed.dayOfWeek()] + ":";
        } else {
            shown = markets;
            heading = "Giờ họp các chợ:";
        }

        List<String> lines =
                shown.stream()
                        .map(
                                m ->
                                        m.marketName()
                                                + " ("
                                                + m.address()
                                                + ") mở "
                                                + formatRange(m.openingTime(), m.closingTime())
                                                + ", họp vào "
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
                (market == null ? "" : " tại " + market.marketName())
                        + (day == null ? "" : " vào " + DAY_NAMES[day]);
        if (schedules.isEmpty()) {
            return new Answer(
                    ChatIntent.FARMER_AVAILABILITY,
                    "Chưa có Farmer nào có mặt" + scope + ".",
                    List.of());
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
                ChatIntent.FARMER_AVAILABILITY,
                joinLines("Farmer có mặt" + scope + ":", lines),
                results);
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
                    "Bạn muốn xem khung giờ nhận hàng của stall hoặc chợ nào? Ví dụ: \"khung giờ lấy hàng ở chợ Bến Thành\".",
                    List.of());
        }

        Integer day = parsed.dayOfWeek();
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(
                        farmer == null ? null : farmer.farmerId(),
                        market == null ? null : market.marketId(),
                        day);
        String scope =
                (farmer == null ? "" : " của " + farmer.stallName())
                        + (market == null ? "" : " tại " + market.marketName())
                        + (day == null ? "" : " vào " + DAY_NAMES[day]);
        if (schedules.isEmpty()) {
            return new Answer(
                    ChatIntent.PICKUP_WINDOW,
                    "Chưa có khung giờ nhận hàng" + scope + ".",
                    List.of());
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
                joinLines("Khung giờ nhận hàng" + scope + ":", lines)
                        + "\nLưu ý: sửa/huỷ đơn chỉ được trước giờ cutoff của Farmer.",
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
        NumberFormat format = NumberFormat.getIntegerInstance(Locale.of("vi", "VN"));
        return format.format(price) + " ₫";
    }

    private static String formatRange(LocalTime start, LocalTime end) {
        return TIME.format(start) + "–" + TIME.format(end);
    }

    private static String formatDays(List<Integer> days) {
        if (days.isEmpty()) {
            return "(chưa cập nhật)";
        }
        return days.stream().map(d -> DAY_NAMES[d]).collect(Collectors.joining(", "));
    }

    private static String joinLines(String heading, List<String> lines) {
        StringBuilder text = new StringBuilder(heading);
        lines.stream().limit(MAX_LINES).forEach(line -> text.append("\n• ").append(line));
        if (lines.size() > MAX_LINES) {
            text.append("\n… và ").append(lines.size() - MAX_LINES).append(" kết quả khác.");
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
