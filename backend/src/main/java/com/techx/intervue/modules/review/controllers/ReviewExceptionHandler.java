package com.techx.intervue.modules.review.controllers;

import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.review.exceptions.AlreadyRespondedException;
import com.techx.intervue.modules.review.exceptions.AlreadyReviewedException;
import com.techx.intervue.modules.review.exceptions.OrderNotCompletedException;
import com.techx.intervue.modules.review.exceptions.ReviewNotFoundException;
import com.techx.intervue.modules.review.exceptions.ReviewNotYoursException;
import com.techx.intervue.modules.review.exceptions.TargetNotInOrderException;
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

@RestControllerAdvice(
        assignableTypes = {
            ReviewController.class,
            PublicReviewController.class,
            FarmerReviewController.class,
            AdminReviewController.class
        })
public class ReviewExceptionHandler {

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

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiResource<Void>> unreadableBody(HttpMessageNotReadableException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    @ExceptionHandler(TargetNotInOrderException.class)
    ResponseEntity<ApiResource<Void>> notInOrder(TargetNotInOrderException e) {
        return error(HttpStatus.BAD_REQUEST, "TARGET_NOT_IN_ORDER", e.getMessage(), List.of());
    }

    @ExceptionHandler(OrderNotCompletedException.class)
    ResponseEntity<ApiResource<Void>> notCompleted(OrderNotCompletedException e) {
        return error(HttpStatus.FORBIDDEN, "ORDER_NOT_COMPLETED", e.getMessage(), List.of());
    }

    @ExceptionHandler({OrderNotYoursException.class, ReviewNotYoursException.class})
    ResponseEntity<ApiResource<Void>> notYours(RuntimeException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(AlreadyReviewedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReviewed(AlreadyReviewedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REVIEWED", e.getMessage(), List.of());
    }

    @ExceptionHandler(AlreadyRespondedException.class)
    ResponseEntity<ApiResource<Void>> alreadyResponded(AlreadyRespondedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_RESPONDED", e.getMessage(), List.of());
    }

    @ExceptionHandler({OrderNotFoundException.class, ReviewNotFoundException.class})
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_review")) {
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REVIEWED",
                    "You have already reviewed this.",
                    List.of());
        }
        if (cause.contains("review_id")) {
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_RESPONDED",
                    "You have already responded to this review.",
                    List.of());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> forbidden(AccessDeniedException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
