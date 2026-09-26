package com.techx.intervue.modules.farmer.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Handler này là lưới an toàn cuối: không bắt DataIntegrityViolationException thì lỗi rơi xuống
 * /error, bị SecurityConfig trả 401 và FE tưởng người dùng hết phiên.
 */
class FarmerExceptionHandlerTest {

    private final FarmerExceptionHandler handler = new FarmerExceptionHandler();

    private static DataIntegrityViolationException violation(String mysqlMessage) {
        return new DataIntegrityViolationException(
                "could not execute statement", new java.sql.SQLException(mysqlMessage));
    }

    /** Dữ liệu quá dài cho cột: lỗi của request, không phải hết phiên. */
    @Test
    void aColumnOverflowBecomes400() {
        ResponseEntity<ApiResource<Void>> response =
                handler.dataIntegrity(violation("Data too long for column 'video_path' at row 1"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getError().getCode()).isEqualTo("VALIDATION_ERROR");
    }

    /**
     * Hai request nộp đơn cùng lúc lọt qua existsByUserId: UNIQUE của DB chặn → 409, không phải
     * 400.
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
