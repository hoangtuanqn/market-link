package com.techx.intervue.modules.user.controllers;

import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.modules.user.exceptions.InvalidResetTokenException;
import com.techx.intervue.modules.user.exceptions.MfaCodeInvalidException;
import com.techx.intervue.modules.user.exceptions.MfaLockedException;
import com.techx.intervue.modules.user.exceptions.MfaStateException;
import com.techx.intervue.modules.user.exceptions.MfaTokenInvalidException;
import com.techx.intervue.modules.user.exceptions.OAuthNotConfiguredException;
import com.techx.intervue.modules.user.exceptions.PasswordAlreadySetException;
import com.techx.intervue.modules.user.exceptions.RoleMismatchException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Trả 400/401/403/409/502/503 cho AuthController. Repo chưa có handler chung nên thiếu class này
 * thì lỗi rơi xuống /error và bị trả 401 (giống ChatExceptionHandler).
 */
@Slf4j
@RestControllerAdvice(
        assignableTypes = {AuthController.class, MfaController.class, AvatarController.class})
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
    @ExceptionHandler(OAuthNotConfiguredException.class)
    ResponseEntity<ApiResource<Void>> notConfigured(OAuthNotConfiguredException e) {
        log.error(e.getMessage());
        return error(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAUTH_NOT_CONFIGURED",
                "This sign-in method is not set up yet.",
                List.of());
    }

    /**
     * Redis / hàng đợi / DB không phản hồi (UserSessionCache, RedisJobQueue ném
     * IllegalStateException; Redis rớt ném DataAccessException). DataIntegrityViolationException có
     * handler riêng cụ thể hơn nên không rơi vào đây.
     */
    @ExceptionHandler({IllegalStateException.class, DataAccessException.class})
    ResponseEntity<ApiResource<Void>> unavailable(RuntimeException e) {
        log.error("Auth request failed: {}", e.getMessage());
        return error(
                HttpStatus.SERVICE_UNAVAILABLE,
                "SERVICE_UNAVAILABLE",
                "Something went wrong on our side. Please try again later.",
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

    @ExceptionHandler(RoleMismatchException.class)
    ResponseEntity<ApiResource<Void>> roleMismatch(RoleMismatchException e) {
        return error(HttpStatus.FORBIDDEN, "ROLE_NOT_ALLOWED", e.getMessage(), List.of());
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
    /** Ảnh đại diện: thiếu part "file" hoặc body multipart hỏng. */
    @ExceptionHandler({MissingServletRequestPartException.class, MultipartException.class})
    ResponseEntity<ApiResource<Void>> badUpload(Exception e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(
                        FieldErrorResource.builder()
                                .field("file")
                                .message("Choose a photo to upload.")
                                .build()));
    }

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

    /**
     * Hai request cùng email/phone lọt qua bước kiểm tra cùng lúc → UNIQUE của DB chặn. Phân biệt
     * theo tên key trong message của MySQL ("Duplicate entry '...' for key 'users.email'"); lỗi
     * khác (dữ liệu quá dài...) không phải trùng tài khoản → 400.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> uniqueViolation(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("users.email")) {
            return duplicate(
                    new DuplicateAccountException("email", "This email is already registered."));
        }
        if (cause.contains("users.phone")) {
            return duplicate(
                    new DuplicateAccountException(
                            "phone", "This phone number is already registered."));
        }
        if (cause.contains("uq_social_")) {
            String message = "This Google account is already linked. Please try again.";
            return error(HttpStatus.CONFLICT, "DUPLICATE_ACCOUNT", message, List.of());
        }
        log.warn("Data integrity violation: {}", cause);
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    /** FR-008: token chờ nhập mã sai / hết hạn → phải đăng nhập lại. */
    @ExceptionHandler(MfaTokenInvalidException.class)
    ResponseEntity<ApiResource<Void>> mfaTokenInvalid(MfaTokenInvalidException e) {
        return error(HttpStatus.BAD_REQUEST, "MFA_TOKEN_INVALID", e.getMessage(), List.of());
    }

    /** FR-008: mã sai → 400 (không 401, FE hiểu 401 là hết phiên); details kèm số lần còn lại. */
    @ExceptionHandler(MfaCodeInvalidException.class)
    ResponseEntity<ApiResource<Void>> mfaCodeInvalid(MfaCodeInvalidException e) {
        String left =
                e.getAttemptsLeft()
                        + (e.getAttemptsLeft() == 1 ? " more try" : " more tries")
                        + " before the account is locked for 15 minutes.";
        return error(
                HttpStatus.BAD_REQUEST,
                "MFA_CODE_INVALID",
                e.getMessage(),
                List.of(FieldErrorResource.builder().field("code").message(left).build()));
    }

    @ExceptionHandler(MfaLockedException.class)
    ResponseEntity<ApiResource<Void>> mfaLocked(MfaLockedException e) {
        ErrorResource error = ErrorResource.builder().code("MFA_LOCKED").details(List.of()).build();
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(e.getRetryAfterSeconds()))
                .body(ApiResource.error(error, e.getMessage()));
    }

    @ExceptionHandler(MfaStateException.class)
    ResponseEntity<ApiResource<Void>> mfaState(MfaStateException e) {
        return error(HttpStatus.CONFLICT, "MFA_STATE", e.getMessage(), List.of());
    }

    /**
     * @PreAuthorize("hasRole('ADMIN')") trên MfaController: đăng nhập nhưng sai role → 403.
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
