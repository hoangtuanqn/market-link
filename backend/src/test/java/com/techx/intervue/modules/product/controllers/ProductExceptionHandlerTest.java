package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.quality.exceptions.ShelfLifeExtensionLockedException;
import com.techx.intervue.resources.ApiResource;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

class ProductExceptionHandlerTest {

    private final ProductExceptionHandler handler = new ProductExceptionHandler();

    @Test
    void theLockIsA409OnTheShelfLifeField() {
        ResponseEntity<ApiResource<Void>> r =
                handler.extensionLocked(
                        new ShelfLifeExtensionLockedException(LocalDate.of(2026, 11, 30)));

        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(r.getBody().getError().getCode()).isEqualTo("SHELF_LIFE_EXTENSION_LOCKED");
        assertThat(r.getBody().getError().getDetails())
                .extracting("field")
                .containsExactly("shelfLifeDays");
        assertThat(r.getBody().getMessage()).contains("2026-11-30");
    }
}
