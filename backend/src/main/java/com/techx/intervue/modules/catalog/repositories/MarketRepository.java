package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.Market;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketRepository extends JpaRepository<Market, Long> {

    /** Same comparison as uq_market_name (the column collation ignores case and accents). */
    Optional<Market> findByMarketName(String marketName);
}
