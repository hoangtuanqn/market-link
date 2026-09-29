package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MarketImageRepository extends JpaRepository<MarketImage, Long> {

    void deleteByMarketId(Long marketId);

    List<MarketImage> findByMarketIdOrderBySortOrderAsc(Long marketId);

    @Transactional
    default void replaceImages(Long marketId, List<String> imageUrls) {
        deleteByMarketId(marketId);
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
