package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

class QualityExceptionHandlerScopeTest {

    @Test
    void everyControllerOfTheModuleIsCovered() {
        RestControllerAdvice advice =
                QualityExceptionHandler.class.getAnnotation(RestControllerAdvice.class);

        assertThat(Arrays.asList(advice.assignableTypes()))
                .containsExactlyInAnyOrder(
                        QualityReportPhotoController.class,
                        QualityReportController.class,
                        FarmerQualityReportController.class,
                        AdminQualityReportController.class);
    }
}
