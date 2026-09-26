package com.techx.intervue.modules.order.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.order.enums.OrderStatus;
import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.exceptions.StallUnavailableException;
import com.techx.intervue.resources.ApiResource;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

/** R-06 / contract: a state conflict is 409, never 400; wrong owner / wrong role is 403. */
class OrderExceptionHandlerTest {

    private final OrderExceptionHandler handler = new OrderExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

    @Test
    void stockSlotCutoffStallAndTransitionConflictsAre409() {
        assertError(
                handler.outOfStock(new OutOfStockException(1L, "Rau muống")), 409, "OUT_OF_STOCK");
        assertError(handler.slotFull(new SlotFullException(9L)), 409, "SLOT_FULL");
        assertError(
                handler.slotUnavailable(new SlotNotAvailableException()), 409, "SLOT_UNAVAILABLE");
        assertError(
                handler.stallUnavailable(new StallUnavailableException(3L)),
                409,
                "STALL_UNAVAILABLE");
        assertError(handler.cutoffPassed(new CutoffPassedException()), 409, "CUTOFF_PASSED");
        assertError(
                handler.invalidTransition(
                        new InvalidOrderTransitionException(
                                OrderStatus.COMPLETED, OrderStatus.CANCELLED)),
                409,
                "INVALID_TRANSITION");
    }

    @Test
    void someoneElsesOrderAndTheWrongRoleAre403() {
        assertError(handler.notYours(new OrderNotYoursException()), 403, "FORBIDDEN");
        assertError(handler.forbidden(new AccessDeniedException("admin")), 403, "FORBIDDEN");
    }

    /** Khác với sai chủ (403): id không tồn tại chút nào là 404, không phải 403. */
    @Test
    void aMissingOrderIs404() {
        assertError(handler.notFound(new OrderNotFoundException(999L)), 404, "NOT_FOUND");
    }

    /** Last backstop: a UNIQUE order_code violation or a stock / capacity CHECK is still 409. */
    @Test
    void databaseConstraintViolationsAre409() {
        assertError(
                handler.dataIntegrity(
                        violation(
                                "Duplicate entry 'ML-20260926-ABCD' for key 'orders.order_code'")),
                409,
                "ORDER_CONFLICT");
        assertError(
                handler.dataIntegrity(
                        violation("Check constraint 'ck_products_stock' is violated.")),
                409,
                "OUT_OF_STOCK");
        assertError(
                handler.dataIntegrity(
                        violation("Check constraint 'ck_slot_capacity' is violated.")),
                409,
                "SLOT_FULL");
    }

    private static DataIntegrityViolationException violation(String message) {
        return new DataIntegrityViolationException("x", new SQLException(message));
    }
}
