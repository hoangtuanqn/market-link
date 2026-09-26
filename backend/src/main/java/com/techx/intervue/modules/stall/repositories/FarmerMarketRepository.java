package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.FarmerMarket;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FarmerMarketRepository extends JpaRepository<FarmerMarket, Long> {
    Optional<FarmerMarket> findByFarmerIdAndMarketId(Long farmerId, Long marketId);
}
