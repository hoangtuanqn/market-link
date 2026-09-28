package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Pins the role rules of the module's controllers (the repo has no MockMvc, like
 * FarmerControllerAccessTest): a forgotten @PreAuthorize would open an admin endpoint to anyone.
 */
class QualityControllerAccessTest {

    private static String rule(Class<?> controller) {
        PreAuthorize annotation = controller.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

    /** D-13: the buyer is a customer or a Farmer shopping at another stall, never an admin. */
    @Test
    void onlyBuyersUploadReportPhotos() {
        assertThat(rule(QualityReportPhotoController.class))
                .isEqualTo("hasAnyRole('CUSTOMER','FARMER')");
    }

    @Test
    void onlyBuyersReportSpoiledProduce() {
        assertThat(rule(QualityReportController.class))
                .isEqualTo("hasAnyRole('CUSTOMER','FARMER')");
    }
}
