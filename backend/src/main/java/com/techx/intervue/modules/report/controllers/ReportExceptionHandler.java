package com.techx.intervue.modules.report.controllers;

import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** 400/403 for the report module (read-only endpoints: nothing to conflict with). */
@RestControllerAdvice(assignableTypes = {FarmerReportController.class, AdminReportController.class})
public class ReportExceptionHandler {

    /** Unknown status, or a date that is not {@code yyyy-MM-dd}. */
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiResource<Void>> badRequest(Exception e) {
        String message =
                e instanceof MethodArgumentTypeMismatchException
                        ? "Some of the information you sent is not valid."
                        : e.getMessage();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> forbidden(AccessDeniedException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message) {
        ErrorResource error = ErrorResource.builder().code(code).details(List.of()).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
