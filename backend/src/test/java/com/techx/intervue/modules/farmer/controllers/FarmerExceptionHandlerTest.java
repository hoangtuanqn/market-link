package com.techx.intervue.modules.farmer.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * This handler is the last safety net: if DataIntegrityViolationException is not caught the error
 * falls through to /error, SecurityConfig returns 401 and the FE thinks the user's session ended.
 */
class FarmerExceptionHandlerTest {

    private final FarmerExceptionHandler handler = new FarmerExceptionHandler();

    private static DataIntegrityViolationException violation(String mysqlMessage) {
        return new DataIntegrityViolationException(
                "could not execute statement", new java.sql.SQLException(mysqlMessage));
    }

    /** Data too long for the column: a request error, not a session end. */
    @Test
    void aColumnOverflowBecomes400() {
        ResponseEntity<ApiResource<Void>> response =
                handler.dataIntegrity(violation("Data too long for column 'video_path' at row 1"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getError().getCode()).isEqualTo("VALIDATION_ERROR");
    }

    /**
     * Two application requests at the same time both get past existsByUserId: the DB's UNIQUE
     * blocks → 409, not 400.
     */
    @Test
    void aDuplicateApplicationBecomes409() {
        ResponseEntity<ApiResource<Void>> response =
                handler.dataIntegrity(
                        violation("Duplicate entry '5' for key 'farmer_profiles.user_id'"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getError().getCode()).isEqualTo("FARMER_APPLICATION_EXISTS");
    }
}
