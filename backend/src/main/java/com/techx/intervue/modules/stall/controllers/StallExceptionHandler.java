package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotYoursException;
import com.techx.intervue.modules.stall.exceptions.MarketAlreadyJoinedException;
import com.techx.intervue.modules.stall.exceptions.SlotBelowBookedException;
import com.techx.intervue.modules.stall.exceptions.SlotNotFoundException;
import com.techx.intervue.modules.stall.exceptions.SlotNotYoursException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
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
 * Returns 400/403/404/409 for the stall module — same reason as FarmerExceptionHandler (no shared
 * handler yet).
 */
@RestControllerAdvice(
        assignableTypes = {
            PublicFarmerController.class,
            FarmerStallController.class,
            FarmerSlotController.class
        })
public class StallExceptionHandler {

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

    /**
     * Business rules in the service (cutoff outside 1…72, end time before start time, unknown
     * market) → 400.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** R-06 / D-09: the stall is missing, not approved (for customers) or not yours → 404. */
    @ExceptionHandler({
        FarmerProfileNotFoundException.class,
        FarmerMarketNotFoundException.class,
        SlotNotFoundException.class
    })
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallNotApprovedException.class)
    ResponseEntity<ApiResource<Void>> notApproved(StallNotApprovedException e) {
        return error(HttpStatus.FORBIDDEN, "STALL_NOT_APPROVED", e.getMessage(), List.of());
    }

    @ExceptionHandler({FarmerMarketNotYoursException.class, SlotNotYoursException.class})
    ResponseEntity<ApiResource<Void>> notYours(RuntimeException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(MarketAlreadyJoinedException.class)
    ResponseEntity<ApiResource<Void>> alreadyJoined(MarketAlreadyJoinedException e) {
        return error(HttpStatus.CONFLICT, "MARKET_ALREADY_JOINED", e.getMessage(), List.of());
    }

    /**
     * D-06: lowering capacity below the number of orders already placed → 409, old orders
     * unchanged.
     */
    @ExceptionHandler(SlotBelowBookedException.class)
    ResponseEntity<ApiResource<Void>> belowBooked(SlotBelowBookedException e) {
        return error(HttpStatus.CONFLICT, "SLOT_BELOW_BOOKED", e.getMessage(), List.of());
    }

    /**
     * Last safety net when two requests both get past the check: UNIQUE (farmer_id, market_id), or
     * uq_slot when two "Generate" calls run at the same time.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_farmer_market")) {
            return alreadyJoined(new MarketAlreadyJoinedException());
        }
        if (cause.contains("uq_slot")) {
            return error(
                    HttpStatus.CONFLICT,
                    "SLOT_CONFLICT",
                    "These slots were just generated by another request. Reload and try again.",
                    List.of());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    /**
     * @PreAuthorize sai role → 403.
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
     * No body, malformed JSON or a value of the wrong type (QA E2E v2 BUG-002). Without this the
     * error falls through to /error and comes back as Spring's default body instead of the
     * envelope.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResource<Void>> unreadableBody(HttpMessageNotReadableException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
