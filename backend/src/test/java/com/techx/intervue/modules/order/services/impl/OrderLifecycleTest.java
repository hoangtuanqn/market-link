package com.techx.intervue.modules.order.services.impl;

import static com.techx.intervue.modules.order.enums.OrderStatus.ACCEPTED;
import static com.techx.intervue.modules.order.enums.OrderStatus.CANCELLED;
import static com.techx.intervue.modules.order.enums.OrderStatus.COMPLETED;
import static com.techx.intervue.modules.order.enums.OrderStatus.DECLINED;
import static com.techx.intervue.modules.order.enums.OrderStatus.PLACED;
import static com.techx.intervue.modules.order.enums.OrderStatus.READY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;

/**
 * D-04 and D-05 written as code. Every rule about "which state it may move to" lives in exactly one
 * place.
 */
class OrderLifecycleTest {

    @Test
    void allowsTheHappyPath() {
        assertThatCode(
                        () -> {
                            OrderLifecycle.assertTransition(PLACED, ACCEPTED);
                            OrderLifecycle.assertTransition(ACCEPTED, READY);
                            OrderLifecycle.assertTransition(READY, COMPLETED);
                        })
                .doesNotThrowAnyException();
    }

    @Test
    void allowsDeclineOnlyFromPlaced() {
        assertThatCode(() -> OrderLifecycle.assertTransition(PLACED, DECLINED))
                .doesNotThrowAnyException();
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(ACCEPTED, DECLINED))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    /** D-04: "accepted can still be cancelled by the customer before cutoff". */
    @Test
    void allowsCancelFromPlacedAndAccepted() {
        assertThatCode(() -> OrderLifecycle.assertTransition(PLACED, CANCELLED))
                .doesNotThrowAnyException();
        assertThatCode(() -> OrderLifecycle.assertTransition(ACCEPTED, CANCELLED))
                .doesNotThrowAnyException();
    }

    @Test
    void refusesCancelOnceReady() {
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(READY, CANCELLED))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    @Test
    void refusesEveryTransitionOutOfATerminalStatus() {
        for (var terminal : new Object[] {COMPLETED, DECLINED, CANCELLED}) {
            assertThatThrownBy(
                            () ->
                                    OrderLifecycle.assertTransition(
                                            (com.techx.intervue.modules.order.enums.OrderStatus)
                                                    terminal,
                                            ACCEPTED))
                    .isInstanceOf(InvalidOrderTransitionException.class);
        }
    }

    @Test
    void refusesSkippingAcceptedStraightToReady() {
        assertThatThrownBy(() -> OrderLifecycle.assertTransition(PLACED, READY))
                .isInstanceOf(InvalidOrderTransitionException.class);
    }

    /** D-07: editing an order sends it back to placed, even when the Farmer already accepted it. */
    @Test
    void allowsGoingBackFromAcceptedToPlaced() {
        assertThatCode(() -> OrderLifecycle.assertTransition(ACCEPTED, PLACED))
                .doesNotThrowAnyException();
    }

    @Test
    void onlyDeclinedAndCancelledGiveStockBack() {
        assertThat(OrderLifecycle.restoresStock(DECLINED)).isTrue();
        assertThat(OrderLifecycle.restoresStock(CANCELLED)).isTrue();
        assertThat(OrderLifecycle.restoresStock(COMPLETED)).isFalse();
        assertThat(OrderLifecycle.restoresStock(READY)).isFalse();
    }

    /** D-05: cutoff_at = pickup_datetime − order_cutoff_hours. */
    @Test
    void cutoffIsPickupStartMinusFarmerHours() {
        LocalDateTime cutoff =
                OrderLifecycle.cutoffAt(LocalDate.of(2026, 10, 4), LocalTime.of(8, 0), 12);

        assertThat(cutoff).isEqualTo(LocalDateTime.of(2026, 10, 3, 20, 0));
    }

    @Test
    void cutoffCrossesMonthBoundaryCorrectly() {
        LocalDateTime cutoff =
                OrderLifecycle.cutoffAt(LocalDate.of(2026, 10, 1), LocalTime.of(7, 0), 24);

        assertThat(cutoff).isEqualTo(LocalDateTime.of(2026, 9, 30, 7, 0));
    }

    @Test
    void cannotCancelAfterCutoffEvenOneSecondLate() {
        LocalDateTime cutoff = LocalDateTime.of(2026, 10, 3, 20, 0);

        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff.minusSeconds(1)))
                .isTrue();
        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff)).isFalse();
        assertThat(OrderLifecycle.canCustomerCancel(PLACED, cutoff, cutoff.plusSeconds(1)))
                .isFalse();
    }

    @Test
    void cannotModifyAnOrderThatIsAlreadyReady() {
        LocalDateTime cutoff = LocalDateTime.of(2026, 10, 3, 20, 0);

        assertThat(OrderLifecycle.canCustomerModify(READY, cutoff, cutoff.minusHours(1))).isFalse();
        assertThat(OrderLifecycle.canCustomerModify(PLACED, cutoff, cutoff.minusHours(1))).isTrue();
        assertThat(OrderLifecycle.canCustomerModify(ACCEPTED, cutoff, cutoff.minusHours(1)))
                .isTrue();
    }
}
