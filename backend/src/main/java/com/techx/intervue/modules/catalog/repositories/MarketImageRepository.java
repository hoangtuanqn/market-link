package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MarketImageRepository extends JpaRepository<MarketImage, Long> {

    void deleteByMarketId(Long marketId);

    List<MarketImage> findByMarketIdOrderBySortOrderAsc(Long marketId);

    /**
     * Overwrites a market's whole set of images: delete everything and write it back in exactly the
     * given order, avoiding a one-by-one comparison of old images against new ones.
     */
    @Transactional
    default void replaceImages(Long marketId, List<String> imageUrls) {
        deleteByMarketId(marketId);
        // Same reason as MarketOperatingDayRepository#replaceDays: Hibernate orders INSERT before
        // DELETE
        // on flush, so a flush must be forced here before writing it back.
        flush();
        int order = 0;
        for (String url : imageUrls) {
            MarketImage row = new MarketImage();
            row.setMarketId(marketId);
            row.setImageUrl(url);
            row.setSortOrder(order++);
            save(row);
        }
    }
}
