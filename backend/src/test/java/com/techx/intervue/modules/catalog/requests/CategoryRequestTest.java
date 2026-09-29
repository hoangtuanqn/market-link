package com.techx.intervue.modules.catalog.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CategoryRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void anOverLongNameGetsAReadableMessage() {
        Set<ConstraintViolation<CategoryRequest>> violations =
                validator.validate(new CategoryRequest("A".repeat(81), 0, 1, 3));

        assertThat(violations)
                .singleElement()
                .satisfies(
                        v -> {
                            assertThat(v.getPropertyPath().toString()).isEqualTo("name");
                            assertThat(v.getMessage())
                                    .isEqualTo("Keep the category name to 80 characters or fewer.");
                        });
    }

    @Test
    void eightyCharactersIsStillAllowed() {
        assertThat(validator.validate(new CategoryRequest("A".repeat(80), 0, 1, 3))).isEmpty();
    }
}
