package com.techx.intervue.modules.stall.repositories;

import com.techx.intervue.modules.stall.entities.FarmerOperatingDay;
import com.techx.intervue.modules.stall.requests.OperatingDaysRequest;
import java.time.LocalTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface FarmerOperatingDayRepository extends JpaRepository<FarmerOperatingDay, Long> {

    void deleteByFarmerMarketId(Long farmerMarketId);

    List<FarmerOperatingDay> findByFarmerMarketId(Long farmerMarketId);

    /**
     * Overwrites a stall's whole set of time windows at one market: delete everything and write it
     * again (contract §4).
     */
    @Transactional
    default void replaceDays(Long farmerMarketId, List<OperatingDaysRequest.Day> days) {
        deleteByFarmerMarketId(farmerMarketId);
        // Hibernate orders INSERT before DELETE on flush; without forcing a flush here, writing
        // back exactly the
        // days that already exist
        // would violate UNIQUE (…, day_of_week) — the 400 on PUT …/days when the old set of days is
        // saved again.
        flush();
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
