package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.modules.user.exceptions.CustomerNotFoundException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** 400/403/404 for {@link AdminCustomerController} — same shape as the other module handlers. */
@RestControllerAdvice(assignableTypes = AdminCustomerController.class)
public class AdminCustomerExceptionHandler {

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

    /** Status outside active/inactive, or a stall / admin account. */
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                e.getMessage(),
                List.of(
                        FieldErrorResource.builder()
                                .field("status")
                                .message(e.getMessage())
                                .build()));
    }

    @ExceptionHandler(CustomerNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(CustomerNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

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
