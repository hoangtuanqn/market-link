package com.techx.intervue.modules.product.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.Test;

class FarmerDailyStockRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void zeroUnitPriceIsRejected() {
        Set<ConstraintViolation<FarmerDailyStockRequest>> violations =
                validator.validate(new FarmerDailyStockRequest(10, BigDecimal.ZERO));

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .containsExactly("unitPrice");
    }

    @Test
    void nullUnitPriceIsAllowed() {
        assertThat(validator.validate(new FarmerDailyStockRequest(10, null))).isEmpty();
    }

    @Test
    void positiveUnitPriceIsAccepted() {
        assertThat(validator.validate(new FarmerDailyStockRequest(10, new BigDecimal("18000"))))
                .isEmpty();
    }
}
