package com.techx.intervue.modules.user.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.techx.intervue.modules.user.exceptions.DuplicateAccountException;
import com.techx.intervue.modules.user.exceptions.OAuthNotConfiguredException;
import com.techx.intervue.modules.user.exceptions.SignupCodeExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupCodeInvalidException;
import com.techx.intervue.modules.user.exceptions.SignupExpiredException;
import com.techx.intervue.modules.user.exceptions.SignupRateLimitedException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

class AuthExceptionHandlerTest {

    private final AuthExceptionHandler handler = new AuthExceptionHandler();

    private static DataIntegrityViolationException violation(String mysqlMessage) {
        return new DataIntegrityViolationException(
                "could not execute statement",
                new SQLIntegrityConstraintViolationException(mysqlMessage));
    }

    private static String code(ResponseEntity<ApiResource<Void>> response) {
        return response.getBody().getError().getCode();
    }

    @Test
    void duplicatePhoneIsReportedOnPhoneField() {
        ResponseEntity<ApiResource<Void>> response =
                handler.uniqueViolation(
                        violation("Duplicate entry '0901234567' for key 'users.phone'"));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody().getError().getDetails().getFirst().getField())
                .isEqualTo("phone");
    }

    @Test
    void dataTooLongIsNotReportedAsDuplicate() {
        ResponseEntity<ApiResource<Void>> response =
                handler.uniqueViolation(violation("Data too long for column 'email' at row 1"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(code(response)).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void redisFailureIsNotReportedAsOAuthNotConfigured() {
        assertThat(code(handler.unavailable(new IllegalStateException("queue down"))))
                .isEqualTo("SERVICE_UNAVAILABLE");
        assertThat(code(handler.unavailable(new RedisConnectionFailureException("down"))))
                .isEqualTo("SERVICE_UNAVAILABLE");
        assertThat(code(handler.notConfigured(new OAuthNotConfiguredException("google"))))
                .isEqualTo("OAUTH_NOT_CONFIGURED");
    }

    /** QA E2E v2 BUG-005: one detail per taken field, so the form marks both inputs. */
    @Test
    void duplicateAccountListsEveryTakenField() {
        Map<String, String> taken = new LinkedHashMap<>();
        taken.put("email", "This email is already registered.");
        taken.put("phone", "This phone number is already registered.");

        ResponseEntity<ApiResource<Void>> response =
                handler.duplicate(new DuplicateAccountException(taken));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(code(response)).isEqualTo("DUPLICATE_ACCOUNT");
        assertThat(response.getBody().getError().getDetails())
                .extracting(FieldErrorResource::getField)
                .containsExactly("email", "phone");
    }

    @Test
    void aWrongSignUpCodeCarriesTheTriesLeft() {
        ResponseEntity<ApiResource<Void>> response =
                handler.signupCodeInvalid(new SignupCodeInvalidException(3));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(code(response)).isEqualTo("SIGNUP_CODE_INVALID");
        assertThat(response.getBody().getError().getDetails())
                .extracting(FieldErrorResource::getField, FieldErrorResource::getMessage)
                .contains(tuple("attemptsLeft", "3"));
    }

    @Test
    void usedUpCodesAndExpiredSignUpsHaveTheirOwnCodes() {
        assertThat(code(handler.signupCodeExpired(new SignupCodeExpiredException())))
                .isEqualTo("SIGNUP_CODE_EXPIRED");
        ResponseEntity<ApiResource<Void>> gone =
                handler.signupExpired(new SignupExpiredException());
        assertThat(gone.getStatusCode().value()).isEqualTo(410);
        assertThat(code(gone)).isEqualTo("SIGNUP_EXPIRED");
    }

    @Test
    void tooManyCodesSaysWhenToTryAgain() {
        ResponseEntity<ApiResource<Void>> response =
                handler.signupRateLimited(new SignupRateLimitedException(42));

        assertThat(response.getStatusCode().value()).isEqualTo(429);
        assertThat(code(response)).isEqualTo("RATE_LIMITED");
        assertThat(response.getHeaders().getFirst(HttpHeaders.RETRY_AFTER)).isEqualTo("42");
    }
}
