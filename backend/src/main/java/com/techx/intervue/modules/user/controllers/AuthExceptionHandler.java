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
 * Returns 400/401/403/409/502/503 for AuthController. The repo has no shared handler yet, so
 * without this class errors fall through to /error and come back as 401 (like
 * ChatExceptionHandler).
 */
@Slf4j
@RestControllerAdvice(
        assignableTypes = {
            AuthController.class,
            MfaController.class,
            AvatarController.class,
            SettingsController.class
        })
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

    /** Google does not respond, times out or returns a 5xx error. */
    @ExceptionHandler(RestClientException.class)
    ResponseEntity<ApiResource<Void>> providerUnavailable(RestClientException e) {
        log.warn("OAuth provider call failed: {}", e.getMessage());
        return error(
                HttpStatus.BAD_GATEWAY,
                "OAUTH_PROVIDER_ERROR",
                "Could not reach Google. Please try again later.",
                List.of());
    }

    /** The client id / secret in app.oauth.* has not been filled in */
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
     * Redis / the queue / the DB does not respond (UserSessionCache, RedisJobQueue throw
     * IllegalStateException; a Redis drop throws DataAccessException).
     * DataIntegrityViolationException has a more specific handler of its own so it does not fall in
     * here.
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

    /** FR-007: the password-reset token is wrong, already used or expired. */
    /** Avatar: the "file" part is missing or the multipart body is broken. */
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
     * Two requests with the same email/phone get past the check at the same time → the DB's UNIQUE
     * blocks. Tell them apart by the key name in MySQL's message ("Duplicate entry '...' for key
     * 'users.email'"); other errors (data too long...) are not a duplicate account → 400.
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

    /** FR-008: the pending-code token is wrong / expired → the user must sign in again. */
    @ExceptionHandler(MfaTokenInvalidException.class)
    ResponseEntity<ApiResource<Void>> mfaTokenInvalid(MfaTokenInvalidException e) {
        return error(HttpStatus.BAD_REQUEST, "MFA_TOKEN_INVALID", e.getMessage(), List.of());
    }

    /**
     * FR-008: a wrong code → 400 (not 401, the FE reads 401 as session ended); details carries the
     * remaining attempts.
     */
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
     * @PreAuthorize("hasRole('ADMIN')") on MfaController: signed in but the wrong role → 403.
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
