package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketImage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MarketImageRepository extends JpaRepository<MarketImage, Long> {

    void deleteByMarketId(Long marketId);

    List<MarketImage> findByMarketIdOrderBySortOrderAsc(Long marketId);

    /**
     * Ghi đè trọn bộ ảnh của một chợ: xoá hết rồi ghi lại theo đúng thứ tự truyền vào, tránh phải
     * so sánh ảnh cũ với ảnh mới từng cái một.
     */
    @Transactional
    default void replaceImages(Long marketId, List<String> imageUrls) {
        deleteByMarketId(marketId);
        // Cùng lý do với MarketOperatingDayRepository#replaceDays: Hibernate xếp INSERT trước
        // DELETE
        // khi flush, nên phải ép flush ở đây trước khi ghi lại.
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
