package com.techx.intervue.modules.catalog.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLIntegrityConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

class CatalogExceptionHandlerShelfLifeTest {

    @Test
    void mapsTheDuplicateGuideKeyToAConflictOnTheGroupName() {
        var e =
                new DataIntegrityViolationException(
                        "insert",
                        new SQLIntegrityConstraintViolationException(
                                "Duplicate entry '5-Leafy greens-chilled' for key"
                                        + " 'shelf_life_guides.uq_shelf_life_guide'"));

        var response = new CatalogExceptionHandler().dataIntegrity(e);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getError().getCode()).isEqualTo("DUPLICATE_SHELF_LIFE_GUIDE");
        assertThat(response.getBody().getError().getDetails().getFirst().getField())
                .isEqualTo("groupName");
    }
}
