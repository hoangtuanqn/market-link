package com.techx.intervue.modules.user.requests;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.geo.requests.AddressPartsRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class PasswordBytesTest {

    private static final String ACCENTED = "ệ".repeat(40);
    private static final String EMOJI = "🍅".repeat(19);

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

    private static List<String> messagesOn(Object request, String field) {
        return validator.validate(request).stream()
                .filter(v -> v.getPropertyPath().toString().equals(field))
                .map(ConstraintViolation::getMessage)
                .toList();
    }

    private static CustomerRegisterRequest register(String password) {
        return new CustomerRegisterRequest(
                "Nguyen Van An",
                "0900000002",
                "an@example.com",
                new AddressPartsRequest("VN", "79", "26743", "Le Loi", "12", null, null),
                password,
                password,
                null,
                null,
                null);
    }

    @Test
    void signUpRefusesAPasswordOverSeventyTwoBytes() {
        assertThat(messagesOn(register(ACCENTED), "password"))
                .containsExactly(RegisterRules.PASSWORD_BYTES_MESSAGE);
        assertThat(messagesOn(register(EMOJI), "password"))
                .containsExactly(RegisterRules.PASSWORD_BYTES_MESSAGE);
    }

    @Test
    void changeResetAndSetPasswordRefuseItToo() {
        assertThat(
                        messagesOn(
                                new ChangePasswordRequest("old-pass", ACCENTED, ACCENTED),
                                "newPassword"))
                .containsExactly(RegisterRules.PASSWORD_BYTES_MESSAGE);
        assertThat(messagesOn(new ResetPasswordRequest("token", ACCENTED, ACCENTED), "newPassword"))
                .containsExactly(RegisterRules.PASSWORD_BYTES_MESSAGE);
        assertThat(messagesOn(new SetPasswordRequest(ACCENTED, ACCENTED), "password"))
                .containsExactly(RegisterRules.PASSWORD_BYTES_MESSAGE);
    }

    @Test
    void anAccentedPasswordThatFitsIsAccepted() {
        assertThat(messagesOn(register("ệ".repeat(24)), "password")).isEmpty();
        assertThat(messagesOn(register("Mật khẩu an toàn 2026"), "password")).isEmpty();
    }

    @Test
    void overSeventyTwoCharactersShowsOnlyTheLengthMessage() {
        assertThat(messagesOn(register("a".repeat(73)), "password"))
                .containsExactly(RegisterRules.PASSWORD_MESSAGE);
    }
}
