package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketOperatingDay;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MarketOperatingDayRepository extends JpaRepository<MarketOperatingDay, Long> {

    void deleteByMarketId(Long marketId);

    /** Ghi đè trọn bộ ngày họp chợ: xoá hết rồi ghi lại, tránh phải so sánh từng dòng. */
    @Transactional
    default void replaceDays(Long marketId, List<Integer> days) {
        deleteByMarketId(marketId);
        days.stream()
                .distinct()
                .sorted()
                .forEach(
                        d -> {
                            MarketOperatingDay row = new MarketOperatingDay();
                            row.setMarketId(marketId);
                            row.setDayOfWeek(d);
                            save(row);
                        });
    }
}
