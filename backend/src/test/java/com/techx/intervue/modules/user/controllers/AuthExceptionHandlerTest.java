package com.techx.intervue.modules.user.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.user.exceptions.OAuthNotConfiguredException;
import com.techx.intervue.resources.ApiResource;
import java.sql.SQLIntegrityConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.RedisConnectionFailureException;
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
}
