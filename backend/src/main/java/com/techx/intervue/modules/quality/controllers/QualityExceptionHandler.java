package com.techx.intervue.modules.quality.controllers;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
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
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * 400/403/404/409 for the spoilage module (FR-122, FR-123), same envelope as the review and product
 * handlers. Every controller of the module must be listed here, or its errors reach Tomcat as a 500
 * (QualityExceptionHandlerScopeTest).
 */
@RestControllerAdvice(
        assignableTypes = {
            QualityReportPhotoController.class,
            QualityReportController.class,
            FarmerQualityReportController.class
        })
public class QualityExceptionHandler {

    private static final String INVALID_MESSAGE = "Some of the information you sent is not valid.";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResource<Void>> invalidBody(MethodArgumentNotValidException e) {
        List<FieldErrorResource> details =
                e.getBindingResult().getFieldErrors().stream()
                        .map(f -> field(f.getField(), f.getDefaultMessage()))
                        .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, details);
    }

    /** No body, malformed JSON, an unknown problem value or a query value of the wrong type. */
    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    ResponseEntity<ApiResource<Void>> unreadable(Exception e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    @ExceptionHandler(InvalidFieldException.class)
    ResponseEntity<ApiResource<Void>> invalidField(InvalidFieldException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(field(e.getField(), e.getMessage())));
    }

    /** Spec §8: a photo of another type is a 400 here, like every other upload of the app. */
    @ExceptionHandler(UnsupportedImageTypeException.class)
    ResponseEntity<ApiResource<Void>> unsupportedImage(UnsupportedImageTypeException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(field("file", e.getMessage())));
    }

    /**
     * The "file" part is missing or misnamed, or the multipart body itself is broken — same message
     * QualityReportPhotoService uses for an empty file, same shape as
     * AuthExceptionHandler#badUpload (AvatarController).
     */
    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    ResponseEntity<ApiResource<Void>> badUpload(Exception e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(field("file", "Choose a photo to upload.")));
    }

    /** The order or the line is not there → 404, without saying which. */
    @ExceptionHandler({
        OrderNotFoundException.class,
        ReportedItemNotFoundException.class,
        QualityReportNotFoundException.class
    })
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /** R-06: someone else's order → 403, never 404 (the order is real). */
    @ExceptionHandler({OrderNotYoursException.class, QualityReportNotYoursException.class})
    ResponseEntity<ApiResource<Void>> notYours(RuntimeException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    /** Spec §8: reporting before the order is completed is a 409. */
    @ExceptionHandler(ReportNeedsCompletedOrderException.class)
    ResponseEntity<ApiResource<Void>> notCompleted(ReportNeedsCompletedOrderException e) {
        return error(HttpStatus.CONFLICT, "ORDER_NOT_COMPLETED", e.getMessage(), List.of());
    }

    @ExceptionHandler(ReportWindowClosedException.class)
    ResponseEntity<ApiResource<Void>> windowClosed(ReportWindowClosedException e) {
        return error(HttpStatus.CONFLICT, "REPORT_WINDOW_CLOSED", e.getMessage(), List.of());
    }

    @ExceptionHandler(ItemAlreadyReportedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReported(ItemAlreadyReportedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REPORTED", e.getMessage(), List.of());
    }

    /** Spec §4.4.2, §4.4.3: a decided report is final. */
    @ExceptionHandler(ReportAlreadyDecidedException.class)
    ResponseEntity<ApiResource<Void>> alreadyDecided(ReportAlreadyDecidedException e) {
        return error(HttpStatus.CONFLICT, "REPORT_ALREADY_DECIDED", e.getMessage(), List.of());
    }

    /** {@code @PreAuthorize} wrong role, or an account without a stall → 403. */
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> forbidden(AccessDeniedException e) {
        return error(
                HttpStatus.FORBIDDEN,
                "FORBIDDEN",
                "You do not have permission to do this.",
                List.of());
    }

    /** Last net for two requests at once: the UNIQUE keys of V20260928006. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_quality_report_item")) {
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REPORTED",
                    "You have already reported this item.",
                    List.of());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
    }

    private static FieldErrorResource field(String name, String message) {
        return FieldErrorResource.builder().field(name).message(message).build();
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
