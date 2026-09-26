package com.techx.intervue.modules.catalog.repositories;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.catalog.entities.Market;
import com.techx.intervue.modules.catalog.entities.MarketImage;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** Chạy trên MySQL thật, cùng khuôn với MarketOperatingDayRepositoryTest. */
@SpringBootTest
@Transactional
class MarketImageRepositoryTest {

    @Autowired MarketRepository markets;
    @Autowired MarketImageRepository images;

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
    void replacingImagesKeepsOnlyTheNewOnesInOrder() {
        Long id = newMarket().getId();

        images.replaceImages(
                id, List.of("/uploads/market-images/a.jpg", "/uploads/market-images/b.jpg"));
        images.replaceImages(id, List.of("/uploads/market-images/b.jpg"));
        images.flush();

        assertThat(images.findByMarketIdOrderBySortOrderAsc(id))
                .extracting(MarketImage::getImageUrl)
                .containsExactly("/uploads/market-images/b.jpg");
    }

    @Test
    void replaceImagesStoresSortOrderMatchingListPosition() {
        Long id = newMarket().getId();

        images.replaceImages(
                id,
                List.of(
                        "/uploads/market-images/a.jpg",
                        "/uploads/market-images/b.jpg",
                        "/uploads/market-images/c.jpg"));

        assertThat(images.findByMarketIdOrderBySortOrderAsc(id))
                .extracting(MarketImage::getImageUrl)
                .containsExactly(
                        "/uploads/market-images/a.jpg",
                        "/uploads/market-images/b.jpg",
                        "/uploads/market-images/c.jpg");
    }
}
