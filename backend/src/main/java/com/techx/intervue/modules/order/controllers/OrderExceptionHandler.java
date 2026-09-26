package com.techx.intervue.modules.order.controllers;

import com.techx.intervue.modules.order.exceptions.CutoffPassedException;
import com.techx.intervue.modules.order.exceptions.InvalidOrderTransitionException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.order.exceptions.OutOfStockException;
import com.techx.intervue.modules.order.exceptions.ProductNotInOrderException;
import com.techx.intervue.modules.order.exceptions.SlotFullException;
import com.techx.intervue.modules.order.exceptions.SlotNotAvailableException;
import com.techx.intervue.modules.order.exceptions.StallUnavailableException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * HTTP codes for the order module. Out of stock, slot full / unavailable, past cutoff, a stall no
 * longer accepting orders, a wrong-order state change — all of these conflict with the current
 * state → 409, never 400 (R-06, contract "409 state conflict"). Wrong owner / wrong role → 403.
 */
@RestControllerAdvice(assignableTypes = {OrderController.class, FarmerOrderController.class})
public class OrderExceptionHandler {

    private static final String INVALID_MESSAGE = "Some of the information you sent is not valid.";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResource<Void>> invalidBody(MethodArgumentNotValidException e) {
        List<FieldErrorResource> details =
                e.getBindingResult().getFieldErrors().stream()
                        .map(
                                f ->
                                        FieldErrorResource.builder()
                                                .field(f.getField())
                                                .message(f.getDefaultMessage())
                                                .build())
                        .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, details);
    }

    /** Malformed JSON, a date not in yyyy-MM-dd format… */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResource<Void>> unreadable(HttpMessageNotReadableException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    /**
     * A malformed request: a product id that does not exist (preview), a product from another
     * stall.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    @ExceptionHandler(OutOfStockException.class)
    ResponseEntity<ApiResource<Void>> outOfStock(OutOfStockException e) {
        return error(HttpStatus.CONFLICT, "OUT_OF_STOCK", e.getMessage(), List.of());
    }

    /** D-07: editing an order cannot add a new product → a malformed request, not a conflict. */
    @ExceptionHandler(ProductNotInOrderException.class)
    ResponseEntity<ApiResource<Void>> productNotInOrder(ProductNotInOrderException e) {
        return error(HttpStatus.BAD_REQUEST, "PRODUCT_NOT_IN_ORDER", e.getMessage(), List.of());
    }

    @ExceptionHandler(SlotFullException.class)
    ResponseEntity<ApiResource<Void>> slotFull(SlotFullException e) {
        return error(HttpStatus.CONFLICT, "SLOT_FULL", e.getMessage(), List.of());
    }

    @ExceptionHandler(SlotNotAvailableException.class)
    ResponseEntity<ApiResource<Void>> slotUnavailable(SlotNotAvailableException e) {
        return error(HttpStatus.CONFLICT, "SLOT_UNAVAILABLE", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallUnavailableException.class)
    ResponseEntity<ApiResource<Void>> stallUnavailable(StallUnavailableException e) {
        return error(HttpStatus.CONFLICT, "STALL_UNAVAILABLE", e.getMessage(), List.of());
    }

    @ExceptionHandler(CutoffPassedException.class)
    ResponseEntity<ApiResource<Void>> cutoffPassed(CutoffPassedException e) {
        return error(HttpStatus.CONFLICT, "CUTOFF_PASSED", e.getMessage(), List.of());
    }

    /** D-04: a state change out of order → 409, not 400. */
    @ExceptionHandler(InvalidOrderTransitionException.class)
    ResponseEntity<ApiResource<Void>> invalidTransition(InvalidOrderTransitionException e) {
        return error(HttpStatus.CONFLICT, "INVALID_TRANSITION", e.getMessage(), List.of());
    }

    /** R-06: someone else's order → 403. */
    @ExceptionHandler(OrderNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYours(OrderNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    /**
     * An order id that does not exist → 404. Unlike a wrong owner (403): the row really is not
     * there.
     */
    @ExceptionHandler(OrderNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(OrderNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /**
     * @PreAuthorize with the wrong role, or the service blocks the admin account (D-13) → 403.
     */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> forbidden(AccessDeniedException e) {
        return error(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to do this.",
                List.of());
    }

    /**
     * Last safety net — reached only when the service's own check slips through: two place-order
     * calls both draw the same order code (UNIQUE order_code, C5-6), or the database's stock /
     * capacity CHECK. Both are conflicts → 409, the customer retries.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("ck_pds_quantity")) {
            return error(
                    HttpStatus.CONFLICT,
                    "OUT_OF_STOCK",
                    "A product in your cart just sold out. Refresh your cart.",
                    List.of());
        }
        if (cause.contains("ck_products_stock")) {
            return error(
                    HttpStatus.CONFLICT,
                    "OUT_OF_STOCK",
                    "A product in your cart just sold out. Refresh your cart.",
                    List.of());
        }
        if (cause.contains("ck_slot_capacity")) {
            return error(
                    HttpStatus.CONFLICT,
                    "SLOT_FULL",
                    "This pickup time is full. Choose another one.",
                    List.of());
        }
        return error(
                HttpStatus.CONFLICT,
                "ORDER_CONFLICT",
                "Your order could not be saved. Please try again.",
                List.of());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
