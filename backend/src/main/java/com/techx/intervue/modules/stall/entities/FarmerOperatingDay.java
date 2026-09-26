package com.techx.intervue.modules.stall.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Khung giờ nhận hàng của một stall tại một chợ, theo thứ trong tuần (FR-061). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "farmer_operating_days")
public class FarmerOperatingDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_market_id", nullable = false)
    private Long farmerMarketId;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "pickup_start_time", nullable = false)
    private LocalTime pickupStartTime;

    @Column(name = "pickup_end_time", nullable = false)
    private LocalTime pickupEndTime;
}
