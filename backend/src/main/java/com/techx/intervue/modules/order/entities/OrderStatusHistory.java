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

/** FR-038: một lần đổi trạng thái đơn. Dòng đầu tiên có fromStatus = NULL (lúc đặt). */
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

    /** Database điền (DEFAULT CURRENT_TIMESTAMP); chỉ đọc. */
    @Column(name = "changed_at", insertable = false, updatable = false)
    private Instant changedAt;
}
