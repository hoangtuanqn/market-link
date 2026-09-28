package com.techx.intervue.modules.user.requests;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.nio.charset.StandardCharsets;

/**
 * BCrypt only takes 72 bytes, not 72 characters: a Vietnamese letter with diacritics is 2–3 bytes
 * in UTF-8 and an emoji 4, so a password that passes @Size(max = 72) could still make the encoder
 * throw (a 500). This refuses it as a 400 on the password field instead. Longer than 72 characters
 * is left to @Size so the form shows only one message.
 */
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = FitsBcrypt.Validator.class)
public @interface FitsBcrypt {
    String message() default RegisterRules.PASSWORD_BYTES_MESSAGE;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    class Validator implements ConstraintValidator<FitsBcrypt, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext context) {
            if (value == null || value.length() > RegisterRules.PASSWORD_MAX) return true;
            return value.getBytes(StandardCharsets.UTF_8).length <= RegisterRules.PASSWORD_MAX;
        }
    }
}
