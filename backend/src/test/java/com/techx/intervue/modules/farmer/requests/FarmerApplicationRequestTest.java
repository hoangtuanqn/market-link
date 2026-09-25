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
 * Các trường nhận URL do client gửi phải chặn ở đây, không để DB chặn: cột hẹp hơn giá trị gửi lên
 * thì Hibernate ném DataIntegrityViolationException, lỗi đó rơi xuống /error và FE đọc thành 401
 * (hết phiên) thay vì 400.
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

    private static FarmerApplicationRequest with(List<String> photoUrls, String videoUrl) {
        return new FarmerApplicationRequest(
                "Khang Family Greens",
                "Khang",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                photoUrls,
                videoUrl,
                null);
    }

    private static Set<String> invalidFields(FarmerApplicationRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }

    /** video_path là VARCHAR(255). */
    @Test
    void videoUrlLongerThanTheColumnIsRejected() {
        assertThat(invalidFields(with(null, "https://x/" + "a".repeat(250)))).contains("videoUrl");
    }

    @Test
    void videoUrlThatFitsTheColumnIsAccepted() {
        assertThat(invalidFields(with(null, "/uploads/farmer-applications/abc.mp4"))).isEmpty();
    }

    /** photo_paths là TEXT, nhưng từng URL vẫn phải có trần — không nhận chuỗi tuỳ ý. */
    @Test
    void aPhotoUrlLongerThanTheColumnIsRejected() {
        assertThat(invalidFields(with(List.of("https://x/" + "a".repeat(250)), null)))
                .anyMatch(field -> field.startsWith("photoUrls"));
    }
}
