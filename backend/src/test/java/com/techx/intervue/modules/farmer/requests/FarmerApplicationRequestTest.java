package com.techx.intervue.modules.farmer.requests;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * Fields that take a URL sent by the client must be blocked here, not left to the DB: when the
 * column is narrower than the value sent Hibernate throws DataIntegrityViolationException, that
 * error falls through to /error and the FE reads it as 401 (session ended) instead of 400.
 */
class FarmerApplicationRequestTest {

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

    private static final List<String> ONE_PHOTO =
            List.of("/uploads/farmer-applications/1/plot.jpg");

    private static FarmerApplicationRequest with(List<String> photoUrls, String videoUrl) {
        return new FarmerApplicationRequest(
                "Khang Family Greens", "Khang", null, photoUrls, videoUrl);
    }

    private static Set<String> invalidFields(FarmerApplicationRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }

    /** video_path is VARCHAR(255). */
    @Test
    void videoUrlLongerThanTheColumnIsRejected() {
        assertThat(invalidFields(with(null, "https://x/" + "a".repeat(250)))).contains("videoUrl");
    }

    @Test
    void videoUrlThatFitsTheColumnIsAccepted() {
        assertThat(invalidFields(with(ONE_PHOTO, "/uploads/farmer-applications/abc.mp4")))
                .isEmpty();
    }

    /**
     * Images are the only evidence the admin looks at to approve: the form requires at least one
     * image, and so does the server.
     */
    @Test
    void anApplicationWithoutPhotosIsRejected() {
        assertThat(invalidFields(with(null, null))).contains("photoUrls");
        assertThat(invalidFields(with(List.of(), null))).contains("photoUrls");
    }

    @Test
    void aBlankPhotoUrlDoesNotCountAsAPhoto() {
        assertThat(invalidFields(with(List.of("  "), null)))
                .anyMatch(field -> field.startsWith("photoUrls"));
    }

    /**
     * photo_paths is TEXT, but each URL still needs a ceiling — an arbitrary string is not
     * accepted.
     */
    @Test
    void aPhotoUrlLongerThanTheColumnIsRejected() {
        assertThat(invalidFields(with(List.of("https://x/" + "a".repeat(250)), null)))
                .anyMatch(field -> field.startsWith("photoUrls"));
    }
}
