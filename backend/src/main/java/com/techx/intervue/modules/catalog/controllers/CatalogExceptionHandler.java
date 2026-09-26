package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.modules.catalog.exceptions.CategoryNotFoundException;
import com.techx.intervue.modules.catalog.exceptions.DuplicateCategoryException;
import com.techx.intervue.modules.catalog.exceptions.MarketNotFoundException;
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
 * Trả 400/403/404/409 cho các controller của module catalog — cùng lý do FarmerExceptionHandler:
 * repo chưa có handler chung, thiếu class này thì lỗi rơi xuống /error và bị trả 401.
 */
@RestControllerAdvice(
        assignableTypes = {
            CategoryController.class,
            AdminCategoryController.class,
            MarketController.class,
            AdminMarketController.class
        })
public class CatalogExceptionHandler {

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

    /** Luật nghiệp vụ trong service (ngày họp ngoài 0…6, giờ đóng trước giờ mở…) → 400. */
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** R-06: {id} không tồn tại → 404. */
    @ExceptionHandler(CategoryNotFoundException.class)
    ResponseEntity<ApiResource<Void>> categoryNotFound(CategoryNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(MarketNotFoundException.class)
    ResponseEntity<ApiResource<Void>> marketNotFound(MarketNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "MARKET_NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateCategoryException.class)
    ResponseEntity<ApiResource<Void>> duplicateCategory(DuplicateCategoryException e) {
        return error(HttpStatus.CONFLICT, "DUPLICATE_CATEGORY", e.getMessage(), List.of());
    }

    /** Lưới an toàn cuối: UNIQUE bị chặn khi hai request cùng lọt qua existsBySlug. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("categories.")) {
            return duplicateCategory(new DuplicateCategoryException(""));
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
