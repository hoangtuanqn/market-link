package com.techx.intervue.modules.quality.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.order.exceptions.OrderNotFoundException;
import com.techx.intervue.modules.order.exceptions.OrderNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ItemAlreadyReportedException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.exceptions.ReportNeedsCompletedOrderException;
import com.techx.intervue.modules.quality.exceptions.ReportWindowClosedException;
import com.techx.intervue.modules.quality.exceptions.ReportedItemNotFoundException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import java.sql.SQLException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

class QualityExceptionHandlerTest {

    private final QualityExceptionHandler handler = new QualityExceptionHandler();

    private static void assertError(ResponseEntity<ApiResource<Void>> r, int status, String code) {
        assertThat(r.getStatusCode().value()).isEqualTo(status);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().getError().getCode()).isEqualTo(code);
    }

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
    void aMissingOrBrokenUploadIs400OnTheFileField() {
        ResponseEntity<ApiResource<Void>> missingPart =
                handler.badUpload(new MissingServletRequestPartException("file"));

        assertError(missingPart, 400, "VALIDATION_ERROR");
        assertThat(missingPart.getBody().getError().getDetails())
                .extracting("field")
                .containsExactly("file");
        assertThat(missingPart.getBody().getError().getDetails())
                .extracting("message")
                .containsExactly("Choose a photo to upload.");

        ResponseEntity<ApiResource<Void>> brokenBody =
                handler.badUpload(
                        new MultipartException("Could not parse multipart servlet request"));

        assertError(brokenBody, 400, "VALIDATION_ERROR");
        assertThat(brokenBody.getBody().getError().getDetails())
                .extracting("field")
                .containsExactly("file");
    }

    @Test
    void theWrongRoleIs403() {
        assertError(handler.forbidden(new AccessDeniedException("x")), 403, "FORBIDDEN");
    }

    @Test
    void stateConflictsOfAReportAre409() {
        assertError(
                handler.notCompleted(new ReportNeedsCompletedOrderException()),
                409,
                "ORDER_NOT_COMPLETED");
        assertError(
                handler.windowClosed(ReportWindowClosedException.closed(LocalDate.of(2026, 10, 7))),
                409,
                "REPORT_WINDOW_CLOSED");
        assertError(
                handler.alreadyReported(new ItemAlreadyReportedException()),
                409,
                "ALREADY_REPORTED");
    }

    @Test
    void someoneElsesOrderIs403AndAMissingOneIs404() {
        assertError(handler.notYours(new OrderNotYoursException()), 403, "FORBIDDEN");
        assertError(handler.notFound(new OrderNotFoundException(9L)), 404, "NOT_FOUND");
        assertError(handler.notFound(new ReportedItemNotFoundException()), 404, "NOT_FOUND");
    }

    @Test
    void aDuplicateReportRaceIs409() {
        assertError(
                handler.dataIntegrity(
                        violation(
                                "Duplicate entry '501' for key"
                                        + " 'quality_reports.uq_quality_report_item'")),
                409,
                "ALREADY_REPORTED");
    }

    private static DataIntegrityViolationException violation(String message) {
        return new DataIntegrityViolationException("x", new SQLException(message));
    }

    @Test
    void aReportOfAnotherStallIs403AndAMissingOneIs404() {
        assertError(handler.notYours(new QualityReportNotYoursException()), 403, "FORBIDDEN");
        assertError(handler.notFound(new QualityReportNotFoundException()), 404, "NOT_FOUND");
    }

    @Test
    void aDecidedReportIs409() {
        assertError(
                handler.alreadyDecided(new ReportAlreadyDecidedException()),
                409,
                "REPORT_ALREADY_DECIDED");
    }

    @Test
    void aSecondStrikeForTheSameReportIs409() {
        assertError(
                handler.dataIntegrity(
                        violation(
                                "Duplicate entry '9' for key"
                                        + " 'farmer_violations.uq_farmer_violation_report'")),
                409,
                "REPORT_ALREADY_DECIDED");
    }
}
