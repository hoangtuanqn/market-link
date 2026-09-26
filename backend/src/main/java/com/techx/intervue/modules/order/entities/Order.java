package com.techx.intervue.modules.order.entities;

import com.techx.intervue.modules.order.enums.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One order = one Farmer = one market = one slot (D-01). Table `orders` (V20260926012). The pickup
 * time is copied from the slot at order time, so the Farmer editing or disabling the slot afterward
 * does not change old orders.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_code", nullable = false, length = 20)
    private String orderCode;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    /** farmer_profiles.id, not users.id. */
    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "market_id", nullable = false)
    private Long marketId;

    /**
     * May be NULL: when the slot is deleted the FK is set to NULL, the order still keeps the pickup
     * time it copied.
     */
    @Column(name = "slot_id")
    private Long slotId;

    @Column(name = "pickup_date", nullable = false)
    private LocalDate pickupDate;

    @Column(name = "pickup_start", nullable = false)
    private LocalTime pickupStart;

    @Column(name = "pickup_end", nullable = false)
    private LocalTime pickupEnd;

    /**
     * D-05: local Asia/Ho_Chi_Minh time, computed once at order time from that Farmer's own cutoff.
     *
     * <p>LOCAL_DATE_TIME: sends the LocalDateTime as is through setObject. Hibernate sends a
     * Timestamp by default, and with serverTimezone=UTC the driver converts it to UTC time — the
     * DATETIME column would be off by 7 hours from Vietnam time, which every other SQL statement
     * (chatbot, seed) assumes.
     */
    @JdbcTypeCode(SqlTypes.LOCAL_DATE_TIME)
    @Column(name = "cutoff_at", nullable = false)
    private LocalDateTime cutoffAt;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Convert(converter = OrderStatus.DbConverter.class)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PLACED;

    @Column(name = "customer_note", length = 255)
    private String customerNote;

    /** The Farmer's rejection reason (C5 Task 5.5). */
    @Column(name = "farmer_note", length = 255)
    private String farmerNote;

    /** Filled in by the database (DEFAULT CURRENT_TIMESTAMP); read-only. */
    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
