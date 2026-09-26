package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.entities.MarketOperatingDay;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chạy trên MySQL thật. Ghi đè ngày họp bằng một tập trùng ngày cũ: Hibernate xếp INSERT trước
 * DELETE khi flush, nên không ép flush sau khi xoá thì UNIQUE (market_id, day_of_week) nổ — chính
 * là lỗi 400 mà PUT /farmer/markets/{id}/days gặp lúc lưu lại cùng những ngày đang có.
 */
@SpringBootTest
@Transactional
class MarketOperatingDayRepositoryTest {

    @Autowired MarketRepository markets;
    @Autowired MarketOperatingDayRepository days;

    private Market newMarket() {
        Market m = new Market();
        m.setMarketName("Chợ test " + UUID.randomUUID().toString().substring(0, 8));
        m.setAddress("Test");
        m.setCity("TP. Hồ Chí Minh");
        m.setLatitude(new BigDecimal("10.80000000"));
        m.setLongitude(new BigDecimal("106.70000000"));
        m.setOpeningTime(LocalTime.of(6, 0));
        m.setClosingTime(LocalTime.of(18, 0));
        return markets.save(m);
    }

    @Test
    void replacingDaysWithAnOverlappingSetKeepsOnlyTheNewOnes() {
        Long id = newMarket().getId();

        days.replaceDays(id, List.of(0, 6));
        days.replaceDays(id, List.of(6));
        days.flush();

        assertThat(days.findByMarketIdOrderByDayOfWeek(id))
                .extracting(MarketOperatingDay::getDayOfWeek)
                .containsExactly(6);
    }
}
