package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotYoursException;
import com.techx.intervue.modules.stall.exceptions.StallNotApprovedException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
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
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

/**
 * Trả 400/403/404/409 cho module product — cùng lý do FarmerExceptionHandler (chưa có handler
 * chung).
 */
@RestControllerAdvice(
        assignableTypes = {
            ProductController.class,
            FarmerProductsPublicController.class,
            FarmerProductController.class,
            FarmerProductImageController.class,
            AdminProductController.class
        })
public class ProductExceptionHandler {

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

    /** Danh mục lạ / đã tắt → 400 gắn đúng field, form đánh dấu được ô categoryId. */
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

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** File vượt quá spring.servlet.multipart.max-file-size/max-request-size → 400. */
    @ExceptionHandler({MaxUploadSizeExceededException.class, MultipartException.class})
    ResponseEntity<ApiResource<Void>> uploadTooLarge(Exception e) {
        String message = "File is too large.";
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                message,
                List.of(FieldErrorResource.builder().field("file").message(message).build()));
    }

    /** R-06 / D-09: không có, xoá mềm, bị ẩn hoặc stall chưa duyệt → 404, không lộ lý do. */
    @ExceptionHandler({ProductNotFoundException.class, FarmerProfileNotFoundException.class})
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found.", List.of());
    }

    /** R-06: sản phẩm của stall khác → 403, kể cả khi id có thật. */
    @ExceptionHandler(ProductNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYours(ProductNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallNotApprovedException.class)
    ResponseEntity<ApiResource<Void>> notApproved(StallNotApprovedException e) {
        return error(HttpStatus.FORBIDDEN, "STALL_NOT_APPROVED", e.getMessage(), List.of());
    }

    /** Lưới an toàn cuối: UNIQUE (farmer_id, name) khi một stall đăng trùng tên. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_product_per_farmer")) {
            return error(
                    HttpStatus.CONFLICT,
                    "DUPLICATE_PRODUCT",
                    "You already have a product with this name.",
                    List.of(
                            FieldErrorResource.builder()
                                    .field("name")
                                    .message("You already have a product with this name.")
                                    .build()));
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
