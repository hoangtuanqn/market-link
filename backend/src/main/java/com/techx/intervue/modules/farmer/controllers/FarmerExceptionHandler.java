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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

/**
 * Trả 400/403/404/409 cho FarmerController, AdminFarmerController và FarmerUploadController — repo
 * chưa có handler chung (giống AuthExceptionHandler/ChatExceptionHandler), thiếu class này thì lỗi
 * rơi xuống /error và bị trả 401.
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

    /** R-06: {id} không tồn tại → 404, không lộ có/không có id khác qua mã lỗi khác. */
    @ExceptionHandler(FarmerProfileNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(FarmerProfileNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "FARMER_NOT_FOUND", e.getMessage(), List.of());
    }

    @ExceptionHandler(FarmerApplicationExistsException.class)
    ResponseEntity<ApiResource<Void>> alreadyApplied(FarmerApplicationExistsException e) {
        return error(HttpStatus.CONFLICT, "FARMER_APPLICATION_EXISTS", e.getMessage(), List.of());
    }

    /** R-06: chuyển trạng thái sai thứ tự (duyệt/đình chỉ) → 409 (D-04-style). */
    @ExceptionHandler(InvalidApprovalTransitionException.class)
    ResponseEntity<ApiResource<Void>> invalidTransition(InvalidApprovalTransitionException e) {
        return error(HttpStatus.CONFLICT, "INVALID_APPROVAL_TRANSITION", e.getMessage(), List.of());
    }

    /**
     * Lưới an toàn cuối: dữ liệu dài hơn cột, hoặc hai request nộp đơn cùng lúc cùng lọt qua
     * existsByUserId rồi bị UNIQUE(user_id) chặn. Không bắt ở đây thì lỗi rơi xuống /error, bị trả
     * 401 và FE tưởng người dùng hết phiên.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> dataIntegrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("farmer_profiles.user_id")) {
            return alreadyApplied(new FarmerApplicationExistsException());
        }
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, List.of());
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

    /**
     * @PreAuthorize sai role (customer gọi API admin, admin/farmer tự nộp đơn...) → 403.
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
