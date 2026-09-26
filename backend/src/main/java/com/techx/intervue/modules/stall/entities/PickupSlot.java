package com.techx.intervue.modules.stall.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One pickup time window of a stall at a market on one day (FR-032, FR-067). Table `pickup_slots`
 * (V20260926011); CHECK `ck_slot_capacity` keeps booked_count ≤ max_orders (D-06).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "pickup_slots")
public class PickupSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farmer_market_id", nullable = false)
    private Long farmerMarketId;

    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "max_orders", nullable = false)
    private int maxOrders = 5;

    /** Only orders (C5) increase/decrease it, under lockById's PESSIMISTIC_WRITE lock. */
    @Column(name = "booked_count", nullable = false)
    private int bookedCount;

    /**
     * A Farmer disabling a slot = no more new orders; orders already placed into it are unaffected.
     */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
