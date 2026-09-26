package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketOperatingDay;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface MarketOperatingDayRepository extends JpaRepository<MarketOperatingDay, Long> {

    void deleteByMarketId(Long marketId);

    List<MarketOperatingDay> findByMarketIdOrderByDayOfWeek(Long marketId);

    /**
     * Overwrites a market's whole set of days: delete everything and write it again, avoiding a
     * row-by-row comparison.
     */
    @Transactional
    default void replaceDays(Long marketId, List<Integer> days) {
        deleteByMarketId(marketId);
        // Hibernate orders INSERT before DELETE on flush; without forcing a flush here, writing
        // back exactly the
        // days that already exist
        // would violate UNIQUE (…, day_of_week) — the 400 on PUT …/days when the old set of days is
        // saved again.
        flush();
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
