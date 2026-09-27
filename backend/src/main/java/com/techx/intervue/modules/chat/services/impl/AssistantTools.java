package com.techx.intervue.modules.chat.services.impl;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.repositories.ChatKnowledgeRepository;
import com.techx.intervue.modules.chat.resources.ChatReplyResource.ChatResultItem;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.FarmerRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.MarketRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ProductRow;
import com.techx.intervue.modules.chat.resources.KnowledgeRows.ScheduleRow;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver;
import com.techx.intervue.modules.product.services.impl.ProductAvailabilityResolver.Availability;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * FR-090/091: the tools Claude may call. Every tool is read-only and runs one of the prepared,
 * parameterised queries in {@link ChatKnowledgeRepository} — Claude only picks the tool and fills
 * its arguments, it never writes SQL (R-04). Names typed by the user (market, stall) are resolved
 * against the list of active rows, never passed into a query as free text.
 */
@Component
@RequiredArgsConstructor
public class AssistantTools {

    static final String SEARCH_PRODUCTS = "search_products";
    static final String LIST_MARKETS = "list_markets";
    static final String FIND_STALLS = "find_stalls";
    static final String PICKUP_TIMES = "get_pickup_times";
    static final String SEARCH_GUIDE = "search_user_guide";

    private static final int GUIDE_SECTIONS = 3;
    private static final int MAX_ROWS = 15;
    private static final String[] DAY_NAMES = {
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    };
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final ObjectMapper JSON = new ObjectMapper();

    private final ChatKnowledgeRepository knowledge;
    private final ProductAvailabilityResolver availability;
    private final UserGuideIndex guide;

    /**
     * What one tool call produced.
     *
     * @param content JSON handed back to Claude as the tool_result
     * @param error true when the arguments were unusable (Claude may retry or ask the user)
     * @param intent the FR-092 intent this call stands for
     * @param cards result cards the UI renders as links
     */
    public record ToolOutcome(
            String content, boolean error, ChatIntent intent, List<ChatResultItem> cards) {}

    // ---------------------------------------------------------------- definitions

    private static final String DAY_HINT =
            "Day of week, 0 = Sunday, 1 = Monday … 6 = Saturday. Omit for any day.";
    private static final String MARKET_HINT =
            "Market name as the user wrote it, e.g. 'Bến Thành' or 'chợ Tân Định'. Omit for all"
                    + " markets.";

    static final List<Tool> DEFINITIONS =
            List.of(
                    tool(
                            SEARCH_PRODUCTS,
                            "Search products that approved stalls sell, across all markets or one"
                                    + " market. Returns price in VND per unit, how much is left for the"
                                    + " nearest pickup date, the stall and its markets. Use it for"
                                    + " finding a product, its price, or whether it is in stock.",
                            Map.of(
                                    "keyword",
                                    property(
                                            "string",
                                            "Product or category name in Vietnamese, the language"
                                                    + " of the catalogue, e.g. 'cà chua', 'rau muống',"
                                                    + " 'trứng gà'. Translate English names first."),
                                    "market",
                                    property("string", MARKET_HINT),
                                    "include_sold_out",
                                    property(
                                            "boolean",
                                            "true to also list sold-out products, e.g. when the"
                                                    + " user asks whether something is in stock.")),
                            List.of("keyword")),
                    tool(
                            LIST_MARKETS,
                            "List active markets with address, opening and closing time and the"
                                    + " days they run. Filter by one market or by a day of week.",
                            Map.of(
                                    "market", property("string", MARKET_HINT),
                                    "day_of_week", dayProperty()),
                            List.of()),
                    tool(
                            FIND_STALLS,
                            "Which stalls (Farmers) are at which market on which day, with their"
                                    + " pickup windows. Filter by market and/or day of week.",
                            Map.of(
                                    "market", property("string", MARKET_HINT),
                                    "day_of_week", dayProperty()),
                            List.of()),
                    tool(
                            PICKUP_TIMES,
                            "Pickup windows of one stall, or of all stalls at one market. Give at"
                                    + " least a stall or a market.",
                            Map.of(
                                    "stall",
                                    property(
                                            "string",
                                            "Stall name as the user wrote it, e.g. 'Vườn Út"
                                                    + " Hiền'."),
                                    "market",
                                    property("string", MARKET_HINT),
                                    "day_of_week",
                                    dayProperty()),
                            List.of()),
                    tool(
                            SEARCH_GUIDE,
                            "Search the MarketLink user guide: how to use the website (sign up,"
                                    + " sign in, password, cart, placing, editing or cancelling an"
                                    + " order, cutoff, payment, reviews, favorites, notifications,"
                                    + " messages, settings, applying to sell). Returns the most"
                                    + " relevant guide sections. Answer how-to questions only from"
                                    + " what it returns.",
                            Map.of(
                                    "query",
                                    property(
                                            "string",
                                            "Search words in Vietnamese (the guide's language),"
                                                    + " e.g. 'huỷ đơn cutoff' or 'quên mật khẩu'.")),
                            List.of("query")));

    private static Tool tool(
            String name, String description, Map<String, JsonValue> props, List<String> required) {
        Tool.InputSchema.Properties.Builder properties = Tool.InputSchema.Properties.builder();
        // Sorted so the tool list serialises the same way every time (prompt-cache friendly)
        props.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> properties.putAdditionalProperty(e.getKey(), e.getValue()));
        return Tool.builder()
                .name(name)
                .description(description)
                .inputSchema(
                        Tool.InputSchema.builder()
                                .properties(properties.build())
                                .required(required)
                                .build())
                .build();
    }

    private static JsonValue property(String type, String description) {
        return JsonValue.from(Map.of("type", type, "description", description));
    }

    private static JsonValue dayProperty() {
        return JsonValue.from(
                Map.of("type", "integer", "minimum", 0, "maximum", 6, "description", DAY_HINT));
    }

    // ---------------------------------------------------------------- execution

    /** Runs one tool call. Bad arguments come back as an error outcome, never as an exception. */
    public ToolOutcome run(String name, Map<String, Object> input) {
        try {
            return switch (name) {
                case SEARCH_PRODUCTS -> searchProducts(input);
                case LIST_MARKETS -> listMarkets(input);
                case FIND_STALLS -> findStalls(input);
                case PICKUP_TIMES -> pickupTimes(input);
                case SEARCH_GUIDE -> searchGuide(input);
                default -> error(ChatIntent.UNKNOWN, "Unknown tool: " + name);
            };
        } catch (IllegalArgumentException e) {
            return error(intentOf(name, input), e.getMessage());
        }
    }

    /** The FR-092 intent a tool call stands for. */
    static ChatIntent intentOf(String name, Map<String, Object> input) {
        return switch (name) {
            case SEARCH_PRODUCTS ->
                    Boolean.TRUE.equals(input.get("include_sold_out"))
                            ? ChatIntent.PRODUCT_DETAIL
                            : ChatIntent.FIND_PRODUCT;
            case LIST_MARKETS -> ChatIntent.MARKET_HOURS;
            case FIND_STALLS -> ChatIntent.FARMER_AVAILABILITY;
            case PICKUP_TIMES -> ChatIntent.PICKUP_WINDOW;
            case SEARCH_GUIDE -> ChatIntent.HELP;
            default -> ChatIntent.UNKNOWN;
        };
    }

    private ToolOutcome searchProducts(Map<String, Object> input) {
        String keyword = requiredText(input, "keyword");
        MarketRow market = optionalMarket(input);
        boolean includeSoldOut = Boolean.TRUE.equals(input.get("include_sold_out"));

        List<ProductRow> rows =
                knowledge.searchProducts(
                        keyword, market == null ? null : market.marketId(), includeSoldOut);
        // Per-date stock (FR-063): the price and stock of the nearest pickup date that still has
        // stock, the same numbers the product pages show
        Map<Long, Availability> resolved =
                availability.resolve(
                        rows.stream()
                                .collect(
                                        Collectors.toMap(
                                                ProductRow::productId,
                                                ProductRow::price,
                                                (a, b) -> a)));

        List<Map<String, Object>> products = new ArrayList<>();
        List<ChatResultItem> cards = new ArrayList<>();
        for (ProductRow p : rows) {
            Availability a = resolved.get(p.productId());
            BigDecimal price = a == null ? p.price() : a.price();
            int left = a == null || "sold_out".equals(p.status()) ? 0 : a.quantity();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", p.name());
            row.put("price_vnd", price.longValue());
            row.put("unit", p.unit());
            row.put("left", left);
            row.put("next_pickup_date", a == null ? null : a.date().toString());
            row.put("stall", p.stallName());
            row.put("markets", p.marketNames());
            products.add(row);
            cards.add(
                    new ChatResultItem(
                            "product",
                            p.productId(),
                            p.name(),
                            price.longValue() + " ₫/" + p.unit() + " · " + p.stallName()));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("keyword", keyword);
        out.put("market", market == null ? null : market.marketName());
        out.put("products", products);
        return ok(intentOf(SEARCH_PRODUCTS, input), out, cards);
    }

    private ToolOutcome listMarkets(Map<String, Object> input) {
        MarketRow only = optionalMarket(input);
        Integer day = optionalDay(input);
        List<MarketRow> markets =
                (only != null ? List.of(only) : knowledge.activeMarkets())
                        .stream()
                                .filter(m -> day == null || m.operatingDays().contains(day))
                                .toList();

        List<Map<String, Object>> rows = new ArrayList<>();
        List<ChatResultItem> cards = new ArrayList<>();
        for (MarketRow m : markets) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", m.marketName());
            row.put("address", m.address());
            row.put("opens", time(m.openingTime()));
            row.put("closes", time(m.closingTime()));
            row.put("days", m.operatingDays().stream().map(d -> DAY_NAMES[d]).toList());
            rows.add(row);
            cards.add(new ChatResultItem("market", m.marketId(), m.marketName(), m.address()));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("day", day == null ? null : DAY_NAMES[day]);
        out.put("markets", rows);
        return ok(ChatIntent.MARKET_HOURS, out, cards);
    }

    private ToolOutcome findStalls(Map<String, Object> input) {
        MarketRow market = optionalMarket(input);
        Integer day = optionalDay(input);
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(null, market == null ? null : market.marketId(), day);
        return schedules(ChatIntent.FARMER_AVAILABILITY, null, market, day, schedules);
    }

    private ToolOutcome pickupTimes(Map<String, Object> input) {
        FarmerRow stall = optionalStall(input);
        MarketRow market = optionalMarket(input);
        if (stall == null && market == null) {
            throw new IllegalArgumentException(
                    "Give a stall or a market. Ask the user which one they mean.");
        }
        Integer day = optionalDay(input);
        List<ScheduleRow> schedules =
                knowledge.farmerSchedules(
                        stall == null ? null : stall.farmerId(),
                        market == null ? null : market.marketId(),
                        day);
        return schedules(ChatIntent.PICKUP_WINDOW, stall, market, day, schedules);
    }

    private ToolOutcome schedules(
            ChatIntent intent,
            FarmerRow stall,
            MarketRow market,
            Integer day,
            List<ScheduleRow> schedules) {
        List<Map<String, Object>> rows = new ArrayList<>();
        Map<Long, ChatResultItem> cards = new LinkedHashMap<>();
        schedules.stream()
                .limit(MAX_ROWS)
                .forEach(
                        r -> {
                            Map<String, Object> row = new LinkedHashMap<>();
                            row.put("stall", r.stallName());
                            row.put("market", r.marketName());
                            row.put("day", DAY_NAMES[r.dayOfWeek()]);
                            row.put("pickup_from", time(r.pickupStart()));
                            row.put("pickup_to", time(r.pickupEnd()));
                            rows.add(row);
                            cards.putIfAbsent(
                                    r.farmerId(),
                                    new ChatResultItem(
                                            "farmer", r.farmerId(), r.stallName(), r.marketName()));
                        });
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("stall", stall == null ? null : stall.stallName());
        out.put("market", market == null ? null : market.marketName());
        out.put("day", day == null ? null : DAY_NAMES[day]);
        out.put("schedules", rows);
        out.put("total", schedules.size());
        return ok(intent, out, List.copyOf(cards.values()));
    }

    private ToolOutcome searchGuide(Map<String, Object> input) {
        String query = requiredText(input, "query");
        List<Map<String, Object>> sections =
                guide.search(query, GUIDE_SECTIONS).stream()
                        .map(
                                s -> {
                                    Map<String, Object> row = new LinkedHashMap<>();
                                    row.put("document", s.document());
                                    row.put("section", s.title());
                                    row.put("text", s.text());
                                    return row;
                                })
                        .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("query", query);
        out.put("sections", sections);
        return ok(ChatIntent.HELP, out, List.of());
    }

    // ---------------------------------------------------------------- arguments

    private static String requiredText(Map<String, Object> input, String key) {
        Object value = input.get(key);
        if (!(value instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException("'" + key + "' is required.");
        }
        return text.strip();
    }

    private static Integer optionalDay(Map<String, Object> input) {
        Object value = input.get("day_of_week");
        if (value == null) {
            return null;
        }
        if (value instanceof Number n && n.intValue() >= 0 && n.intValue() <= 6) {
            return n.intValue();
        }
        throw new IllegalArgumentException("'day_of_week' must be a whole number from 0 to 6.");
    }

    private MarketRow optionalMarket(Map<String, Object> input) {
        if (!(input.get("market") instanceof String name) || name.isBlank()) {
            return null;
        }
        List<MarketRow> markets = knowledge.activeMarkets();
        MarketRow match =
                ChatService.matchByName(
                        TextNormalizer.normalize(name),
                        markets,
                        m -> ChatService.coreName(m.marketName()));
        if (match == null) {
            throw new IllegalArgumentException(
                    "No active market matches '"
                            + name
                            + "'. Active markets: "
                            + markets.stream()
                                    .map(MarketRow::marketName)
                                    .collect(Collectors.joining(", "))
                            + ".");
        }
        return match;
    }

    private FarmerRow optionalStall(Map<String, Object> input) {
        if (!(input.get("stall") instanceof String name) || name.isBlank()) {
            return null;
        }
        FarmerRow match =
                ChatService.matchByName(
                        TextNormalizer.normalize(name),
                        knowledge.approvedFarmers(),
                        f -> ChatService.coreName(f.stallName()));
        if (match == null) {
            throw new IllegalArgumentException(
                    "No approved stall matches '" + name + "'. Ask the user to check the name.");
        }
        return match;
    }

    // ---------------------------------------------------------------- output

    private static String time(LocalTime value) {
        return value == null ? null : TIME.format(value);
    }

    private static ToolOutcome ok(
            ChatIntent intent, Map<String, Object> content, List<ChatResultItem> cards) {
        return new ToolOutcome(json(content), false, intent, cards);
    }

    private static ToolOutcome error(ChatIntent intent, String message) {
        return new ToolOutcome(json(Map.of("error", message)), true, intent, List.of());
    }

    private static String json(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialise a tool result", e);
        }
    }
}
