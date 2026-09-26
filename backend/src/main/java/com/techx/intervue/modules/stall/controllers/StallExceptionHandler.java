package com.techx.intervue.modules.stall.controllers;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotFoundException;
import com.techx.intervue.modules.stall.exceptions.FarmerMarketNotYoursException;
import com.techx.intervue.modules.stall.exceptions.MarketAlreadyJoinedException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Trả 400/403/404/409 cho module stall — cùng lý do FarmerExceptionHandler (chưa có handler chung).
 */
@RestControllerAdvice(assignableTypes = {PublicFarmerController.class, FarmerStallController.class})
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
     * Luật nghiệp vụ trong service (cutoff ngoài 1…72, giờ kết thúc trước giờ bắt đầu, chợ lạ) →
     * 400.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** R-06 / D-09: stall không có, chưa duyệt (với khách) hoặc không phải của mình → 404. */
    @ExceptionHandler({FarmerProfileNotFoundException.class, FarmerMarketNotFoundException.class})
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallNotApprovedException.class)
    ResponseEntity<ApiResource<Void>> notApproved(StallNotApprovedException e) {
        return error(HttpStatus.FORBIDDEN, "STALL_NOT_APPROVED", e.getMessage(), List.of());
    }

    @ExceptionHandler(FarmerMarketNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYours(FarmerMarketNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(MarketAlreadyJoinedException.class)
    ResponseEntity<ApiResource<Void>> alreadyJoined(MarketAlreadyJoinedException e) {
        return error(HttpStatus.CONFLICT, "MARKET_ALREADY_JOINED", e.getMessage(), List.of());
    }

    /** Lưới an toàn cuối: UNIQUE (farmer_id, market_id) khi hai request cùng lọt qua kiểm tra. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_farmer_market")) {
            return alreadyJoined(new MarketAlreadyJoinedException());
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

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
