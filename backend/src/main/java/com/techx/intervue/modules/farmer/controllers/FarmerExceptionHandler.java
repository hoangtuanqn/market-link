package com.techx.intervue.modules.farmer.controllers;

import com.techx.intervue.modules.farmer.exceptions.FarmerApplicationExistsException;
import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.farmer.exceptions.InvalidApprovalTransitionException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

/**
 * Returns 400/403/404/409 for FarmerController, AdminFarmerController and FarmerUploadController —
 * the repo has no shared handler yet (like AuthExceptionHandler/ChatExceptionHandler), and without
 * this class errors fall through to /error and come back as 401.
 */
@RestControllerAdvice(
        assignableTypes = {
            FarmerController.class,
            AdminFarmerController.class,
            FarmerUploadController.class
        })
public class FarmerExceptionHandler {

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

    @ExceptionHandler(InvalidFieldException.class)
    ResponseEntity<ApiResource<Void>> invalidField(InvalidFieldException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(
                        FieldErrorResource.builder()
                                .field(e.getField())
                                .message(e.getMessage())
                                .build()));
    }

    /**
     * R-06: {id} does not exist → 404, without revealing whether another id exists through a
     * different error code.
     */
    @ExceptionHandler(FarmerProfileNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(FarmerProfileNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "FARMER_NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(FarmerApplicationExistsException.class)
    ResponseEntity<ApiResource<Void>> alreadyApplied(FarmerApplicationExistsException e) {
        return error(HttpStatus.CONFLICT, "FARMER_APPLICATION_EXISTS", e.getMessage(), List.of());
    }

    /** R-06: a state change out of order (approve/suspend) → 409 (D-04-style). */
    @ExceptionHandler(InvalidApprovalTransitionException.class)
    ResponseEntity<ApiResource<Void>> invalidTransition(InvalidApprovalTransitionException e) {
        return error(HttpStatus.CONFLICT, "INVALID_APPROVAL_TRANSITION", e.getMessage(), List.of());
    }

    /**
     * Last safety net: data longer than the column, or two requests submitting at the same time
     * both get past existsByUserId and then are blocked by UNIQUE(user_id). If it is not caught
     * here the error falls through to /error, comes back as 401 and the FE thinks the user's
     * session ended.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("farmer_profiles.user_id")) {
            return alreadyApplied(new FarmerApplicationExistsException());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    /** A file over spring.servlet.multipart.max-file-size/max-request-size → 400. */
    @ExceptionHandler({MaxUploadSizeExceededException.class, MultipartException.class})
    ResponseEntity<ApiResource<Void>> uploadTooLarge(Exception e) {
        String message = "File is too large.";
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                message,
                List.of(FieldErrorResource.builder().field("file").message(message).build()));
    }

    /**
     * @PreAuthorize with the wrong role (a customer calls an admin API, an admin/farmer applies
     * themself...) → 403.
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
