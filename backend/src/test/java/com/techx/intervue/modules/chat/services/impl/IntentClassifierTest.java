package com.techx.intervue.modules.chat.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.chat.enums.ChatIntent;
import com.techx.intervue.modules.chat.resources.ParsedMessage;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class IntentClassifierTest {

    // 24/09/2026 là Thứ 5 → day_of_week = 4
    private static final LocalDate THURSDAY = LocalDate.of(2026, 9, 24);

    private final IntentClassifier classifier = new IntentClassifier();

    private ParsedMessage classify(String message) {
        return classifier.classify(message, THURSDAY);
    }

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            quoteCharacter = '"', // mặc định là ' — sẽ nuốt ca chèn SQL bên dưới
            value = {
                "Xin chào | GREETING",
                "hello | GREETING",
                "Bạn giúp được gì? | HELP",
                "tìm cà chua | FIND_PRODUCT",
                "ở đâu bán bơ sáp | FIND_PRODUCT",
                "where can I buy tomatoes | FIND_PRODUCT",
                "Cà chua giá bao nhiêu? | PRODUCT_DETAIL",
                "rau muong con hang khong | PRODUCT_DETAIL",
                "Chợ Bến Thành mở cửa mấy giờ? | MARKET_HOURS",
                "chợ nào họp thứ 7 | MARKET_HOURS",
                "Thứ 7 có farmer nào ở chợ Bến Thành? | FARMER_AVAILABILITY",
                "hôm nay có nông dân nào có mặt | FARMER_AVAILABILITY",
                "Khung giờ lấy hàng của Vườn Xanh | PICKUP_WINDOW",
                "lấy hàng mấy giờ | PICKUP_WINDOW",
                "bơ sáp | UNKNOWN",
                "dưa hấu | UNKNOWN",
                "' OR 1=1 -- | UNKNOWN",
            })
    void classifiesIntent(String message, ChatIntent expected) {
        assertThat(classify(message).intent()).isEqualTo(expected);
    }

    @Test
    void acceptsTextWithoutDiacritics() {
        assertThat(classify("ca chua gia bao nhieu").intent()).isEqualTo(ChatIntent.PRODUCT_DETAIL);
        assertThat(classify("cho ben thanh mo cua may gio").intent())
                .isEqualTo(ChatIntent.MARKET_HOURS);
    }

    @Test
    void extractsProductKeyword() {
        assertThat(classify("Tôi muốn tìm cà chua bi").keyword()).isEqualTo("ca chua bi");
        assertThat(classify("Cà chua giá bao nhiêu?").keyword()).isEqualTo("ca chua");
        assertThat(classify("tìm giúp mình rau muống nhé").keyword()).isEqualTo("rau muong");
    }

    @Test
    void helpWordInsideProductSearchStaysFindProduct() {
        ParsedMessage parsed = classify("tìm giúp mình rau muống");
        assertThat(parsed.intent()).isEqualTo(ChatIntent.FIND_PRODUCT);
    }

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "chợ nào họp chủ nhật | 0",
                "farmer nào có mặt thứ 2 | 1",
                "farmer nào có mặt thứ ba | 2",
                "stall t7 | 6",
                "farmer có mặt hôm nay | 4",
                "farmer có mặt ngày mai | 5",
                "which farmers on saturday | 6",
            })
    void extractsDayOfWeekInSchemaNumbering(String message, int expected) {
        assertThat(classify(message).dayOfWeek()).isEqualTo(expected);
    }

    @Test
    void noDayWhenNotMentioned() {
        assertThat(classify("tìm cà chua").dayOfWeek()).isNull();
    }

    @Test
    void normalizesVietnamese() {
        assertThat(TextNormalizer.normalize("  Đậu BẮP, Củ Đỏ!! ")).isEqualTo("dau bap cu do");
        assertThat(TextNormalizer.normalize(null)).isEmpty();
    }
}
