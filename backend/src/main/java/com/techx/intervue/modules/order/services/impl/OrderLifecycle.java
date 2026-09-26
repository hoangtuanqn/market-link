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
 * D-04 and D-05 written as code. Touches no database, depends on no Spring — that way every order
 * lifecycle rule can be tested with plain JUnit and has exactly one definition in the whole
 * project.
 */
public final class OrderLifecycle {

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED =
            Map.of(
                    PLACED, Set.of(ACCEPTED, DECLINED, CANCELLED),
                    // The customer can still cancel before cutoff; editing an order sends it back
                    // to placed for the Farmer to approve again
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

    /**
     * D-02: stock returns to inventory when an order dies, does not return when the order moves
     * forward.
     */
    public static boolean restoresStock(OrderStatus to) {
        return to == DECLINED || to == CANCELLED;
    }

    public static LocalDateTime cutoffAt(
            LocalDate pickupDate, LocalTime pickupStart, int cutoffHours) {
        return LocalDateTime.of(pickupDate, pickupStart).minusHours(cutoffHours);
    }

    /**
     * The exact cutoff moment already counts as late — the boundary closes on the customer's side.
     */
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
