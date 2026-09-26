package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.FarmerOperatingDay;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface FarmerOperatingDayRepository extends JpaRepository<FarmerOperatingDay, Long> {

    void deleteByFarmerMarketId(Long farmerMarketId);

    /** Ghi đè trọn bộ khung giờ của một stall tại một chợ: xoá hết rồi ghi lại (contract §4). */
    @Transactional
    default void replaceDays(Long farmerMarketId, List<OperatingDaysRequest.Day> days) {
        deleteByFarmerMarketId(farmerMarketId);
        for (OperatingDaysRequest.Day day : days) {
            FarmerOperatingDay row = new FarmerOperatingDay();
            row.setFarmerMarketId(farmerMarketId);
            row.setDayOfWeek(day.dayOfWeek());
            row.setPickupStartTime(LocalTime.parse(day.pickupStartTime()));
            row.setPickupEndTime(LocalTime.parse(day.pickupEndTime()));
            save(row);
        }
    }
}
