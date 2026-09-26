package com.techx.intervue.modules.notification.controllers;

import com.techx.intervue.modules.notification.exceptions.InvalidAnnouncementException;
import com.techx.intervue.modules.notification.exceptions.InvalidNotificationPreferenceException;
import com.techx.intervue.modules.notification.exceptions.NotificationAccessDeniedException;
import com.techx.intervue.modules.notification.exceptions.TestNotificationTooSoonException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * HTTP codes per spec §6 for the notification module's controllers (the repo has no shared handler
 * yet).
 */
@RestControllerAdvice(
        assignableTypes = {
            NotificationController.class,
            AdminAnnouncementController.class,
            PublicAnnouncementController.class
        })
public class NotificationExceptionHandler {

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

    @ExceptionHandler({
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        MissingServletRequestParameterException.class,
        MethodArgumentTypeMismatchException.class,
        HttpMessageNotReadableException.class
    })
    ResponseEntity<ApiResource<Void>> invalidRequest(Exception e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    @ExceptionHandler({
        InvalidNotificationPreferenceException.class,
        InvalidAnnouncementException.class
    })
    ResponseEntity<ApiResource<Void>> badRequest(RuntimeException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(EntityNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /** R-06: someone else's → 403. */
    @ExceptionHandler(NotificationAccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> notYours(NotificationAccessDeniedException e) {
        return error(HttpStatus.FORBIDDEN, "NOT_YOURS", e.getMessage(), List.of());
    }

    @ExceptionHandler(TestNotificationTooSoonException.class)
    ResponseEntity<ApiResource<Void>> tooSoon(TestNotificationTooSoonException e) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", e.getMessage(), List.of());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
