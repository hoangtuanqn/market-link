package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

/** The spoilage module's error codes (spec §4.4, §8): 400 input, 403 owner, 404, 409 state. */
class QualityExceptionHandlerTest {

    private final QualityExceptionHandler handler = new QualityExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

    /** Spec §8: a photo of another type is a 400 on the file field, like the other uploads. */
    @Test
    void aPhotoOfAnotherTypeIs400OnTheFileField() {
        ResponseEntity<ApiResource<Void>> r =
                handler.unsupportedImage(new UnsupportedImageTypeException());

        assertError(r, 400, "VALIDATION_ERROR");
        assertThat(r.getBody().getError().getDetails()).extracting("field").containsExactly("file");
    }

    @Test
    void aFieldErrorKeepsItsFieldAndMessage() {
        ResponseEntity<ApiResource<Void>> r =
                handler.invalidField(
                        new InvalidFieldException("file", "The photo must be 5 MB or smaller."));

        assertError(r, 400, "VALIDATION_ERROR");
        assertThat(r.getBody().getError().getDetails())
                .extracting("message")
                .containsExactly("The photo must be 5 MB or smaller.");
    }

    @Test
    void theWrongRoleIs403() {
        assertError(handler.forbidden(new AccessDeniedException("x")), 403, "FORBIDDEN");
    }
}
