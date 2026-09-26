package com.techx.intervue.modules.order.services.impl;

import static com.techx.intervue.modules.order.enums.OrderStatus.ACCEPTED;
import static com.techx.intervue.modules.order.enums.OrderStatus.CANCELLED;
import static com.techx.intervue.modules.order.enums.OrderStatus.COMPLETED;
import static com.techx.intervue.modules.order.enums.OrderStatus.DECLINED;
import static com.techx.intervue.modules.order.enums.OrderStatus.PLACED;
import static com.techx.intervue.modules.order.enums.OrderStatus.READY;

import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import java.util.Set;

/**
 * D-04 và D-05 viết thành code. Không truy cập database, không phụ thuộc Spring — nhờ vậy mọi luật
 * vòng đời đơn hàng test được bằng JUnit thuần và chỉ có đúng một định nghĩa trong cả dự án.
 */
public final class OrderLifecycle {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED =
            Map.of(
                    PLACED, Set.of(ACCEPTED, DECLINED, CANCELLED),
                    // Khách vẫn huỷ được trước cutoff; sửa đơn đưa về placed để Farmer duyệt lại
                    // (D-07)
                    ACCEPTED, Set.of(READY, CANCELLED, PLACED),
                    READY, Set.of(COMPLETED),
                    COMPLETED, Set.of(),
                    DECLINED, Set.of(),
                    CANCELLED, Set.of());

    private OrderLifecycle() {}

    public static void assertTransition(OrderStatus from, OrderStatus to) {
        if (!ALLOWED.getOrDefault(from, Set.of()).contains(to)) {
            throw new InvalidOrderTransitionException(from, to);
        }
    }

    /** D-02: tồn kho quay lại kho khi đơn chết, không quay lại khi đơn đi tiếp. */
    public static boolean restoresStock(OrderStatus to) {
        return to == DECLINED || to == CANCELLED;
    }

    public static LocalDateTime cutoffAt(
            LocalDate pickupDate, LocalTime pickupStart, int cutoffHours) {
        return LocalDateTime.of(pickupDate, pickupStart).minusHours(cutoffHours);
    }

    /** Đúng thời điểm cutoff đã là muộn — biên đóng ở phía khách. */
    private static boolean beforeCutoff(LocalDateTime cutoffAt, LocalDateTime now) {
        return now.isBefore(cutoffAt);
    }

    public static boolean canCustomerCancel(
            OrderStatus status, LocalDateTime cutoffAt, LocalDateTime now) {
        return (status == PLACED || status == ACCEPTED) && beforeCutoff(cutoffAt, now);
    }

    public static boolean canCustomerModify(
            OrderStatus status, LocalDateTime cutoffAt, LocalDateTime now) {
        return (status == PLACED || status == ACCEPTED) && beforeCutoff(cutoffAt, now);
    }
}
