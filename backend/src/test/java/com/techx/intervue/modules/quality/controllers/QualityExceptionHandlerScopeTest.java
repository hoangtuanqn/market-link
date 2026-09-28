package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Same trap as ConversationExceptionHandlerScopeTest: a controller missing from assignableTypes
 * turns every 400/403/409 of the module into a 500.
 */
class QualityExceptionHandlerScopeTest {

    @Test
    void everyControllerOfTheModuleIsCovered() {
        RestControllerAdvice advice =
                QualityExceptionHandler.class.getAnnotation(RestControllerAdvice.class);

        assertThat(Arrays.asList(advice.assignableTypes()))
                .containsExactlyInAnyOrder(
                        QualityReportPhotoController.class,
                        QualityReportController.class,
                        FarmerQualityReportController.class);
    }
}
