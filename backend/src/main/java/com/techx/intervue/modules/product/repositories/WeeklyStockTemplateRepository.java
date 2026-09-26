package com.techx.intervue.modules.product.repositories;

import com.techx.intervue.modules.product.entities.WeeklyStockTemplate;
import com.techx.intervue.modules.product.requests.StockTemplateRequest;
import com.techx.intervue.modules.product.resources.StockTemplateResource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface WeeklyStockTemplateRepository extends JpaRepository<WeeklyStockTemplate, Long> {

    void deleteByFarmerId(Long farmerId);

    List<WeeklyStockTemplate> findByFarmerIdAndDayOfWeekAndActiveTrue(Long farmerId, int dayOfWeek);

    List<WeeklyStockTemplate> findByProductIdAndActiveTrue(Long productId);

    @Query(
            "select new com.techx.intervue.modules.product.resources.StockTemplateResource("
                    + "t.productId, p.name, t.dayOfWeek, t.defaultQuantity, t.defaultPrice) "
                    + "from WeeklyStockTemplate t join Product p on p.id = t.productId "
                    + "where t.farmerId = :farmerId "
                    + "order by t.dayOfWeek, p.name")
    List<StockTemplateResource> findResourcesByFarmerId(@Param("farmerId") Long farmerId);

    /** Ghi đè trọn bộ lịch tuần của một farmer: xoá hết rồi ghi lại (như FarmerOperatingDay). */
    @Transactional
    default void replaceAll(Long farmerId, List<StockTemplateRequest.Item> items) {
        deleteByFarmerId(farmerId);
        // Hibernate xếp INSERT trước DELETE khi flush; không ép flush ở đây thì ghi lại đúng
        // những ngày đang có sẽ vi phạm UNIQUE (product_id, day_of_week).
        flush();
        for (StockTemplateRequest.Item item : items) {
            WeeklyStockTemplate row = new WeeklyStockTemplate();
            row.setFarmerId(farmerId);
            row.setProductId(item.productId());
            row.setDayOfWeek(item.dayOfWeek());
            row.setDefaultQuantity(item.defaultQuantity());
            row.setDefaultPrice(item.defaultPrice());
            save(row);
        }
    }
}
