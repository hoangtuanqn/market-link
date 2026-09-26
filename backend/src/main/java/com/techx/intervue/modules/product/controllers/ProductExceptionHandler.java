package com.techx.intervue.modules.product.controllers;

import com.techx.intervue.modules.farmer.exceptions.FarmerProfileNotFoundException;
import com.techx.intervue.modules.product.exceptions.ProductNotFoundException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Trả 400/404 cho các controller đọc sản phẩm — cùng lý do FarmerExceptionHandler (chưa có handler
 * chung).
 */
@RestControllerAdvice(
        assignableTypes = {ProductController.class, FarmerProductsPublicController.class})
public class ProductExceptionHandler {

    /** R-06 / D-09: không có, xoá mềm, bị ẩn hoặc stall chưa duyệt → 404, không lộ lý do. */
    @ExceptionHandler({ProductNotFoundException.class, FarmerProfileNotFoundException.class})
    ResponseEntity<ApiResource<Void>> notFound(RuntimeException e) {
        return error(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product not found.", List.of());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiResource<Void>> invalidArgument(IllegalArgumentException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
