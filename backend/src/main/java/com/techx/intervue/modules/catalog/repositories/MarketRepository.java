package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.Market;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketRepository extends JpaRepository<Market, Long> {

    Optional<Market> findByMarketName(String marketName);
}
