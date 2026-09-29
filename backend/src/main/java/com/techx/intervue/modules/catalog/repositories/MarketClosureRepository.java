package com.techx.intervue.modules.catalog.repositories;

import com.techx.intervue.modules.catalog.entities.MarketClosure;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MarketClosureRepository extends JpaRepository<MarketClosure, Long> {

    List<MarketClosure> findByMarketIdOrderByClosedOnAsc(Long marketId);

    Optional<MarketClosure> findByIdAndMarketId(Long id, Long marketId);
}
