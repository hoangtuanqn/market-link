package com.techx.intervue.modules.chat.services.impl;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.resources.ParsedMessage;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * Classifies intent with keyword rules on the diacritic-free sentence. No LLM call, no SQL
 * generation. The order of the intents in DOMAIN_TRIGGERS is the priority order (see
 * docs/chatbot-design.md).
 */
@Component
public class IntentClassifier {

    private static final Map<ChatIntent, List<String>> DOMAIN_TRIGGERS = new LinkedHashMap<>();

    static {
        DOMAIN_TRIGGERS.put(
                ChatIntent.PICKUP_WINDOW,
                List.of("lay hang", "nhan hang", "khung gio", "gio lay", "gio nhan", "pickup"));
        DOMAIN_TRIGGERS.put(
                ChatIntent.MARKET_HOURS,
                List.of(
                        "may gio",
                        "mo cua",
                        "dong cua",
                        "gio mo",
                        "gio dong",
                        "gio hop",
                        "hop cho",
                        "cho hop",
                        "nao hop",
                        "hop vao",
                        "hop thu",
                        "opening",
                        "hours",
                        "open",
                        "close"));
        DOMAIN_TRIGGERS.put(
                ChatIntent.FARMER_AVAILABILITY,
                // do not use "sap": without diacritics "sạp" / "sáp" ("bơ sáp") / "sắp" collide
                List.of("farmer", "farmers", "nong dan", "stall", "gian hang", "co mat"));
        DOMAIN_TRIGGERS.put(
                ChatIntent.PRODUCT_DETAIL,
                List.of(
                        "gia",
                        "bao nhieu",
                        "con hang",
                        "het hang",
                        "ton kho",
                        "price",
                        "how much",
                        "in stock"));
    }

    private static final List<String> FIND_TRIGGERS =
            List.of("tim", "mua", "ban", "o dau", "find", "buy", "sell", "where", "search");
    private static final List<String> GREETING_TRIGGERS =
            List.of("xin chao", "chao", "hello", "hi", "hey");
    private static final List<String> HELP_TRIGGERS =
            List.of("giup", "help", "lam duoc gi", "huong dan");

    /** Day-phrases, checked in declaration order. */
    private static final Map<String, Integer> DAY_PHRASES = new LinkedHashMap<>();

    static {
        String[][] days = {
            {"0", "chu nhat", "cn", "sunday"},
            {"1", "thu 2", "thu hai", "t2", "monday"},
            {"2", "thu 3", "thu ba", "t3", "tuesday"},
            {"3", "thu 4", "thu tu", "t4", "wednesday"},
            {"4", "thu 5", "thu nam", "t5", "thursday"},
            {"5", "thu 6", "thu sau", "t6", "friday"},
            {"6", "thu 7", "thu bay", "t7", "saturday"},
        };
        for (String[] day : days) {
            for (int i = 1; i < day.length; i++) {
                DAY_PHRASES.put(day[i], Integer.parseInt(day[0]));
            }
        }
    }

    private static final Set<String> STOPWORDS =
            Set.of(
                    "toi",
                    "minh",
                    "em",
                    "anh",
                    "chi",
                    "ban",
                    "muon",
                    "can",
                    "co",
                    "khong",
                    "ko",
                    "k",
                    "o",
                    "dau",
                    "nao",
                    "nhung",
                    "cac",
                    "la",
                    "gi",
                    "vay",
                    "a",
                    "nhe",
                    "voi",
                    "va",
                    "cua",
                    "cho",
                    "hang",
                    "hom",
                    "nay",
                    "ngay",
                    "mai",
                    "the",
                    "an",
                    "is",
                    "are",
                    "i",
                    "me",
                    "do",
                    "you",
                    "have",
                    "any",
                    "of",
                    "to",
                    "for",
                    "please",
                    "today",
                    "tomorrow",
                    "duoc",
                    "khoe",
                    "oi",
                    "shop",
                    "bot",
                    "san",
                    "pham",
                    "mot",
                    "it",
                    "kg");

    public ParsedMessage classify(String message, LocalDate today) {
        String normalized = TextNormalizer.normalize(message);
        String padded = " " + normalized + " ";
        Integer dayOfWeek = extractDay(padded, today);

        ChatIntent intent = null;
        for (Map.Entry<ChatIntent, List<String>> entry : DOMAIN_TRIGGERS.entrySet()) {
            if (containsAny(padded, entry.getValue())) {
                intent = entry.getKey();
                break;
            }
        }

        String keyword = extractKeyword(padded);

        if (intent == null) {
            if (keyword.isEmpty() && containsAny(padded, GREETING_TRIGGERS)) {
                intent = ChatIntent.GREETING;
            } else if (keyword.isEmpty() && containsAny(padded, HELP_TRIGGERS)) {
                intent = ChatIntent.HELP;
            } else if (containsAny(padded, FIND_TRIGGERS)) {
                intent = ChatIntent.FIND_PRODUCT;
            } else {
                intent = ChatIntent.UNKNOWN;
            }
        }
        return new ParsedMessage(intent, normalized, keyword, dayOfWeek);
    }

    private static Integer extractDay(String padded, LocalDate today) {
        if (containsAny(padded, List.of("hom nay", "today"))) {
            return toSchemaDay(today);
        }
        if (containsAny(padded, List.of("ngay mai", "tomorrow"))) {
            return toSchemaDay(today.plusDays(1));
        }
        for (Map.Entry<String, Integer> entry : DAY_PHRASES.entrySet()) {
            if (padded.contains(" " + entry.getKey() + " ")) {
                return entry.getValue();
            }
        }
        return null;
    }

    /** java.time: Mon = 1 … Sun = 7 → schema: Sun = 0 … Sat = 6. */
    private static int toSchemaDay(LocalDate date) {
        return date.getDayOfWeek().getValue() % 7;
    }

    private static String extractKeyword(String padded) {
        String text = padded;
        for (List<String> phrases : DOMAIN_TRIGGERS.values()) {
            text = removePhrases(text, phrases);
        }
        text = removePhrases(text, FIND_TRIGGERS);
        text = removePhrases(text, GREETING_TRIGGERS);
        text = removePhrases(text, HELP_TRIGGERS);
        text = removePhrases(text, List.copyOf(DAY_PHRASES.keySet()));
        return Arrays.stream(text.trim().split("\\s+"))
                .filter(word -> !word.isEmpty() && !STOPWORDS.contains(word))
                .collect(Collectors.joining(" "));
    }

    private static String removePhrases(String padded, List<String> phrases) {
        String text = padded;
        for (String phrase : phrases) {
            // repeated because adjacent phrases share the space between them
            while (text.contains(" " + phrase + " ")) {
                text = text.replace(" " + phrase + " ", " ");
            }
        }
        return text;
    }

    private static boolean containsAny(String padded, List<String> phrases) {
        return phrases.stream().anyMatch(phrase -> padded.contains(" " + phrase + " "));
    }
}
