package com.techx.intervue.modules.order.entities;

import com.techx.intervue.modules.order.enums.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** FR-038: one order status change. The first row has fromStatus = NULL (at order time). */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "order_status_history")
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Convert(converter = OrderStatus.DbConverter.class)
    @Column(name = "from_status", length = 20)
    private OrderStatus fromStatus;

    @Convert(converter = OrderStatus.DbConverter.class)
    @Column(name = "to_status", nullable = false, length = 20)
    private OrderStatus toStatus;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(length = 255)
    private String note;

    /** Filled in by the database (DEFAULT CURRENT_TIMESTAMP); read-only. */
    @Column(name = "changed_at", insertable = false, updatable = false)
    private Instant changedAt;
}
