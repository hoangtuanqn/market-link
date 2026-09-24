package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Trả 400/401/403/409 cho AuthController. Repo chưa có handler chung nên thiếu class này thì lỗi
 * rơi xuống /error và bị trả 401 (giống ChatExceptionHandler).
 */
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

    private static final String INVALID_MESSAGE = "Dữ liệu gửi lên không hợp lệ!";

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
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ApiResource<Void>> badCredentials(BadCredentialsException e) {
        return error(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", e.getMessage(), List.of());
    }

    @ExceptionHandler(DisabledException.class)
    ResponseEntity<ApiResource<Void>> disabled(DisabledException e) {
        return error(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", e.getMessage(), List.of());
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

    @ExceptionHandler(DuplicateAccountException.class)
    ResponseEntity<ApiResource<Void>> duplicate(DuplicateAccountException e) {
        return error(
                HttpStatus.CONFLICT,
                "DUPLICATE_ACCOUNT",
                e.getMessage(),
                List.of(
                        FieldErrorResource.builder()
                                .field(e.getField())
                                .message(e.getMessage())
                                .build()));
    }

    /** Hai request cùng email/phone lọt qua bước kiểm tra cùng lúc → UNIQUE của DB chặn. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> uniqueViolation(DataIntegrityViolationException e) {
        String message = "Email hoặc số điện thoại đã tồn tại trong hệ thống!";
        return error(
                HttpStatus.CONFLICT,
                "DUPLICATE_ACCOUNT",
                message,
                List.of(FieldErrorResource.builder().message(message).build()));
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
