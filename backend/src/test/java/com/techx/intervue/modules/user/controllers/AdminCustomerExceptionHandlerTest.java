package com.techx.intervue.modules.user.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class AdminCustomerExceptionHandlerTest {

    private final AdminCustomerExceptionHandler handler = new AdminCustomerExceptionHandler();

    @Test
    void invalidFieldExceptionBecomes400WithTheFieldName() {
        ResponseEntity<ApiResource<Void>> response =
                handler.invalidField(
                        new InvalidFieldException(
                                "until", "The ban end time must be in the future."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().getError().getDetails()).hasSize(1);
        assertThat(response.getBody().getError().getDetails().get(0).getField()).isEqualTo("until");
    }
}
