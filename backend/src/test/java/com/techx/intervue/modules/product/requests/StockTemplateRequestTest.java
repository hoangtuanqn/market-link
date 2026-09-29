package com.techx.intervue.modules.product.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class StockTemplateRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private Set<ConstraintViolation<StockTemplateRequest>> validate(BigDecimal price) {
        return validator.validate(
                new StockTemplateRequest(List.of(new StockTemplateRequest.Item(1L, 6, 10, price))));
    }

    @Test
    void zeroDefaultPriceIsRejectedWithAClearMessage() {
        assertThat(validate(BigDecimal.ZERO))
                .extracting(v -> v.getPropertyPath().toString(), ConstraintViolation::getMessage)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(
                                "items[0].defaultPrice", "Price must be greater than 0."));
    }

    @Test
    void blankDefaultPriceKeepsTheProductPrice() {
        assertThat(validate(null)).isEmpty();
    }

    @Test
    void positiveDefaultPriceIsAccepted() {
        assertThat(validate(new BigDecimal("0.50"))).isEmpty();
    }
}
