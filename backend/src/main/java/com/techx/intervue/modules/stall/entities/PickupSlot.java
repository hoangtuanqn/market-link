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
 * Một khung giờ nhận hàng của một stall tại một chợ trong một ngày (FR-032, FR-067). Bảng
 * `pickup_slots` (V20260926011); CHECK `ck_slot_capacity` giữ booked_count ≤ max_orders (D-06).
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

    /** Chỉ đơn hàng (C5) tăng/giảm, dưới khoá PESSIMISTIC_WRITE của lockById. */
    @Column(name = "booked_count", nullable = false)
    private int bookedCount;

    /** Farmer tắt slot = không nhận thêm đơn; đơn đã đặt vào slot vẫn giữ nguyên. */
    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
