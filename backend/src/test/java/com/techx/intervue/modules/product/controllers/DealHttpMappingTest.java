package com.techx.intervue.modules.product.controllers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.techx.intervue.modules.product.exceptions.DateNotOrderableException;
import com.techx.intervue.modules.product.exceptions.ExpiredBeforePickupException;
import com.techx.intervue.modules.product.exceptions.NotNearExpiryException;
import com.techx.intervue.resources.ApiResource;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** FR-124: the deal errors keep the envelope and the codes of spec §4.5.3. */
class DealHttpMappingTest {

    private final ProductExceptionHandler handler = new ProductExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

    @Test
    void theBatchRulesAre400() {
        assertError(
                handler.notNearExpiry(new NotNearExpiryException("fresh")), 400, "NOT_NEAR_EXPIRY");
        assertError(
                handler.expiredBeforePickup(new ExpiredBeforePickupException()),
                400,
                "EXPIRED_BEFORE_PICKUP");
    }

    /**
     * A day that no longer takes orders conflicts with the current state → 409, like a full slot.
     */
    @Test
    void aDayCustomersCanNoLongerOrderIs409() {
        assertError(
                handler.dateNotOrderable(new DateNotOrderableException()),
                409,
                "DATE_NOT_ORDERABLE");
    }

    /** "2026-13-40" as {date}: the envelope with 400, not Spring's default error body. */
    @Test
    void aValueOfTheWrongTypeIs400() {
        assertError(
                handler.wrongType(mock(MethodArgumentTypeMismatchException.class)),
                400,
                "VALIDATION_ERROR");
    }

    /**
     * The module's handler must cover the new controller, or its errors escape as 500 (the bug
     * ConversationExceptionHandlerScopeTest pins for another module).
     */
    @Test
    void theFarmerDealControllerIsCoveredAndIsForFarmersOnly() {
        List<Class<?>> covered =
                Arrays.asList(
                        ProductExceptionHandler.class
                                .getAnnotation(RestControllerAdvice.class)
                                .assignableTypes());

        assertThat(covered).contains(FarmerProductController.class, FarmerDealController.class);
        assertThat(FarmerDealController.class.getAnnotation(PreAuthorize.class).value())
                .isEqualTo("hasRole('FARMER')");
    }

    /** The public controller: covered by the module's handler, and no role rule. */
    @Test
    void theDealsControllerIsCoveredAndPublic() {
        List<Class<?>> covered =
                Arrays.asList(
                        ProductExceptionHandler.class
                                .getAnnotation(RestControllerAdvice.class)
                                .assignableTypes());

        assertThat(covered).contains(DealController.class);
        assertThat(DealController.class.getAnnotation(PreAuthorize.class)).isNull();
    }
}
