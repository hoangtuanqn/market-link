package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.exceptions.InvalidResetTokenException;
import com.techx.intervue.modules.user.exceptions.PasswordAlreadySetException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;

/**
 * Trả 400/401/403/409/502/503 cho AuthController. Repo chưa có handler chung nên thiếu class này
 * thì lỗi rơi xuống /error và bị trả 401 (giống ChatExceptionHandler).
 */
@Slf4j
@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

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

    /** Google không phản hồi, timeout hoặc lỗi 5xx. */
    @ExceptionHandler(RestClientException.class)
    ResponseEntity<ApiResource<Void>> providerUnavailable(RestClientException e) {
        log.warn("OAuth provider call failed: {}", e.getMessage());
        return error(
                HttpStatus.BAD_GATEWAY,
                "OAUTH_PROVIDER_ERROR",
                "Could not reach Google. Please try again later.",
                List.of());
    }

    /** Chưa điền client id / secret trong app.oauth.* */
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<ApiResource<Void>> notConfigured(IllegalStateException e) {
        log.error(e.getMessage());
        return error(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAUTH_NOT_CONFIGURED",
                "This sign-in method is not set up yet.",
                List.of());
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

    /** FR-007: token đặt lại mật khẩu sai, đã dùng hoặc hết hạn. */
    @ExceptionHandler(InvalidResetTokenException.class)
    ResponseEntity<ApiResource<Void>> invalidResetToken(InvalidResetTokenException e) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(PasswordAlreadySetException.class)
    ResponseEntity<ApiResource<Void>> passwordAlreadySet(PasswordAlreadySetException e) {
        return error(HttpStatus.CONFLICT, "PASSWORD_ALREADY_SET", e.getMessage(), List.of());
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
        String message = "This email or phone number is already registered.";
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
