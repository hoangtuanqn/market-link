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
 * Một đơn = một Farmer = một chợ = một slot (D-01). Bảng `orders` (V20260926012). Giờ nhận hàng
 * được chép từ slot lúc đặt, nên Farmer sửa hay tắt slot sau đó không làm đổi đơn cũ.
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

    /** farmer_profiles.id, không phải users.id. */
    @Column(name = "farmer_id", nullable = false)
    private Long farmerId;

    @Column(name = "market_id", nullable = false)
    private Long marketId;

    /** NULL được: slot bị xoá thì FK đặt về NULL, đơn vẫn còn giờ nhận đã chép. */
    @Column(name = "slot_id")
    private Long slotId;

    @Column(name = "pickup_date", nullable = false)
    private LocalDate pickupDate;

    @Column(name = "pickup_start", nullable = false)
    private LocalTime pickupStart;

    @Column(name = "pickup_end", nullable = false)
    private LocalTime pickupEnd;

    /**
     * D-05: giờ local Asia/Ho_Chi_Minh, tính một lần lúc đặt từ cutoff của chính Farmer.
     *
     * <p>LOCAL_DATE_TIME: gửi LocalDateTime nguyên trạng qua setObject. Mặc định Hibernate gửi
     * Timestamp, và với serverTimezone=UTC driver đổi nó sang giờ UTC — cột DATETIME sẽ lệch 7 giờ
     * so với giờ Việt Nam mà mọi câu SQL khác (chatbot, seed) giả định.
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

    /** Lý do Farmer từ chối (C5 Task 5.5). */
    @Column(name = "farmer_note", length = 255)
    private String farmerNote;

    /** Database điền (DEFAULT CURRENT_TIMESTAMP); chỉ đọc. */
    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;
}
