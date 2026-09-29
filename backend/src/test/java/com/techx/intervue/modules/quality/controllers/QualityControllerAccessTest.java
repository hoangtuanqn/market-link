package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;

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

    @Test
    void onlyFarmersReadAndAnswerTheirReports() {
        assertThat(rule(FarmerQualityReportController.class)).isEqualTo("hasRole('FARMER')");
    }

    /** Spec §9 "Quyền": only an admin confirms or dismisses a report. */
    @Test
    void onlyAdminsDecideReports() {
        assertThat(rule(AdminQualityReportController.class)).isEqualTo("hasRole('ADMIN')");
    }

    /**
     * #202: SecurityConfig refuses an admin who has not set up two-step verification only for paths
     * under /api/v1/admin/**; the class-level @PreAuthorize checked above does not by itself gate
     * that (see AdminShelfLifeGuideControllerAccessTest, same pattern).
     */
    @Test
    void reportDecisionsSitUnderTheAdminPathThatNeedsTwoStepVerification() {
        assertThat(AdminQualityReportController.class.getAnnotation(RequestMapping.class).value())
                .allMatch(path -> path.startsWith("/api/v1/admin/"));
    }

    @Test
    void noEndpointOnTheDecisionControllerReplacesTheClassRule() {
        List<Method> endpoints =
                Arrays.stream(AdminQualityReportController.class.getDeclaredMethods())
                        .filter(m -> !m.isSynthetic())
                        .toList();

        assertThat(endpoints).hasSizeGreaterThanOrEqualTo(3);
        assertThat(endpoints).allMatch(m -> m.getAnnotation(PreAuthorize.class) == null);
    }
}
