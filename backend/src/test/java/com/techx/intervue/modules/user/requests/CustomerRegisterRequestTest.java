package com.techx.intervue.modules.user.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * QA E2E v2 BUG-004 (RETEST-001): the sign-up form refused "qa@localdomain" but the API accepted
 * it. Client and server must apply the same email rule.
 */
class CustomerRegisterRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void startValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private static Set<String> invalidFields(String email) {
        CustomerRegisterRequest request =
                new CustomerRegisterRequest(
                        "Nguyen Van An",
                        "0900000002",
                        email,
                        "12 Le Loi, Quan 1",
                        "secret123",
                        "secret123");
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @ParameterizedTest
    @ValueSource(strings = {"qa@localdomain", "qa@", "qa.example.com", "qa @example.com"})
    void refusesAnEmailTheSignUpFormRefuses(String email) {
        assertThat(invalidFields(email)).contains("email");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {"customer@marketlink.vn", "an.nguyen+demo@gmail.com", "qa@sub.example.co"})
    void acceptsARegularEmail(String email) {
        assertThat(invalidFields(email)).doesNotContain("email");
    }
}
