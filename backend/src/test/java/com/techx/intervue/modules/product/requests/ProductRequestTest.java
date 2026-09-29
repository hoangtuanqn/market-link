package com.techx.intervue.modules.product.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.api.Test;

class ProductRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static ProductRequest withPrice(BigDecimal price) {
        return new ProductRequest(1L, "Tomatoes", null, price, "kg", 10, null, 7, null, null, null);
    }

    @Test
    void zeroPriceIsRejected() {
        Set<ConstraintViolation<ProductRequest>> violations =
                validator.validate(withPrice(BigDecimal.ZERO));

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .containsExactly("price");
    }

    @Test
    void negativePriceIsRejected() {
        Set<ConstraintViolation<ProductRequest>> violations =
                validator.validate(withPrice(new BigDecimal("-1")));

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .containsExactly("price");
    }

    @Test
    void positivePriceIsAccepted() {
        assertThat(validator.validate(withPrice(new BigDecimal("0.01")))).isEmpty();
    }
}
