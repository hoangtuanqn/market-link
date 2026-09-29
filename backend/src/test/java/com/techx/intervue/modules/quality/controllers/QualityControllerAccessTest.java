package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;

class QualityControllerAccessTest {

    private static String rule(Class<?> controller) {
        PreAuthorize annotation = controller.getAnnotation(PreAuthorize.class);
        return annotation == null ? null : annotation.value();
    }

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

    @Test
    void onlyAdminsDecideReports() {
        assertThat(rule(AdminQualityReportController.class)).isEqualTo("hasRole('ADMIN')");
    }

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
