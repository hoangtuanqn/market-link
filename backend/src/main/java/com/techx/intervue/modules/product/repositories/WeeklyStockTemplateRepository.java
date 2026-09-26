package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyStockTemplateRepository extends JpaRepository<WeeklyStockTemplate, Long> {

    List<WeeklyStockTemplate> findByFarmerId(Long farmerId);

    List<WeeklyStockTemplate> findByFarmerIdAndDayOfWeekAndActiveTrue(Long farmerId, int dayOfWeek);

    void deleteByFarmerId(Long farmerId);
}
