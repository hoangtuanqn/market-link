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

public final class OrderLifecycle {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED =
            Map.of(
                    PLACED, Set.of(ACCEPTED, DECLINED, CANCELLED),
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

    public static boolean restoresStock(OrderStatus to) {
        return to == DECLINED || to == CANCELLED;
    }

    public static LocalDateTime cutoffAt(
            LocalDate pickupDate, LocalTime pickupStart, int cutoffHours) {
        return LocalDateTime.of(pickupDate, pickupStart).minusHours(cutoffHours);
    }

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
