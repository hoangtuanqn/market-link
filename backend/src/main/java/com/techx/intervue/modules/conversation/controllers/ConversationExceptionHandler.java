package com.techx.intervue.modules.conversation.controllers;

import com.techx.intervue.modules.conversation.exceptions.AccountRestrictedException;
import com.techx.intervue.modules.conversation.exceptions.AlreadyReportedException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentAlreadyUsedException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentNotYoursException;
import com.techx.intervue.modules.conversation.exceptions.AttachmentTooLargeException;
import com.techx.intervue.modules.conversation.exceptions.CannotReportOwnMessageException;
import com.techx.intervue.modules.conversation.exceptions.ConversationAccessDeniedException;
import com.techx.intervue.modules.conversation.exceptions.ConversationClosedException;
import com.techx.intervue.modules.conversation.exceptions.EmptyMessageException;
import com.techx.intervue.modules.conversation.exceptions.ModerationOutOfScopeException;
import com.techx.intervue.modules.conversation.exceptions.RateLimitedException;
import com.techx.intervue.modules.conversation.exceptions.SelfConversationException;
import com.techx.intervue.modules.conversation.exceptions.StallNotOpenException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedImageTypeException;
import com.techx.intervue.modules.conversation.exceptions.UnsupportedMessageKindException;
import com.techx.intervue.modules.user.exceptions.InvalidFieldException;
import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * HTTP codes per spec section 6.3, for the chat module's controllers. An oversized multipart error
 * is handled by the GLOBAL UploadExceptionHandler (Tomcat rejects it while reading the body, before
 * it knows which controller receives it), so do not add it again here: if two advices catch the
 * same exception and neither declares @Order, the returned error.code is undefined.
 *
 * <p>Adding a new controller to the module means adding it to assignableTypes below, otherwise all
 * of its exceptions become 500 — ConversationExceptionHandlerScopeTest pins that down.
 */
@Slf4j
@RestControllerAdvice(
        assignableTypes = {
            ConversationController.class,
            AttachmentController.class,
            AttachmentDownloadController.class,
            MessageReportController.class,
            AdminMessageReportController.class,
            AdminMessageController.class
        })
public class ConversationExceptionHandler {

    private static final String INVALID_MESSAGE = "Some of the information you sent is not valid.";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiResource<Void>> invalidBody(MethodArgumentNotValidException e) {
        List<FieldErrorResource> details =
                e.getBindingResult().getFieldErrors().stream()
                        .map(
                                f ->
                                        FieldErrorResource.builder()
                                                .field(f.getField())
                                                .message(f.getDefaultMessage())
                                                .build())
                        .toList();
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", INVALID_MESSAGE, details);
    }

    @ExceptionHandler({
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        MissingServletRequestParameterException.class,
        MethodArgumentTypeMismatchException.class,
        HttpMessageNotReadableException.class
    })
    ResponseEntity<ApiResource<Void>> invalidRequest(Exception e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    @ExceptionHandler({
        SelfConversationException.class,
        EmptyMessageException.class,
        UnsupportedMessageKindException.class
    })
    ResponseEntity<ApiResource<Void>> badRequest(RuntimeException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ApiResource<Void>> notFound(EntityNotFoundException e) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), List.of());
    }

    /** R-06: wrong owner → 403, not 404, so the FE shows the right reason. */
    @ExceptionHandler(ConversationAccessDeniedException.class)
    ResponseEntity<ApiResource<Void>> notAMember(ConversationAccessDeniedException e) {
        return error(HttpStatus.FORBIDDEN, "NOT_A_MEMBER", e.getMessage(), List.of());
    }

    @ExceptionHandler(StallNotOpenException.class)
    ResponseEntity<ApiResource<Void>> stallNotOpen(StallNotOpenException e) {
        return error(HttpStatus.FORBIDDEN, "STALL_NOT_OPEN", e.getMessage(), List.of());
    }

    @ExceptionHandler(AccountRestrictedException.class)
    ResponseEntity<ApiResource<Void>> accountRestricted(AccountRestrictedException e) {
        return error(HttpStatus.FORBIDDEN, "ACCOUNT_RESTRICTED", e.getMessage(), List.of());
    }

    /** D-09: an old thread can be read, sending more gives 409 with the reason in plain text. */
    @ExceptionHandler(ConversationClosedException.class)
    ResponseEntity<ApiResource<Void>> closed(ConversationClosedException e) {
        return error(HttpStatus.CONFLICT, "CONVERSATION_CLOSED", e.getMessage(), List.of());
    }

    /**
     * Spec §8.4 — limit exceeded. The reason is written out in words so the FE shows the whole
     * sentence.
     */
    @ExceptionHandler(RateLimitedException.class)
    ResponseEntity<ApiResource<Void>> tooManyRequests(RateLimitedException e) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", e.getMessage(), List.of());
    }

    /** R-06: someone else's image → 403, not 404. */
    @ExceptionHandler(AttachmentNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYourAttachment(AttachmentNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "ATTACHMENT_NOT_YOURS", e.getMessage(), List.of());
    }

    /** An image attaches to exactly one message → 409. */
    @ExceptionHandler(AttachmentAlreadyUsedException.class)
    ResponseEntity<ApiResource<Void>> attachmentUsed(AttachmentAlreadyUsedException e) {
        return error(HttpStatus.CONFLICT, "ATTACHMENT_ALREADY_USED", e.getMessage(), List.of());
    }

    /** Spec §6.3 — 413. */
    @ExceptionHandler(AttachmentTooLargeException.class)
    ResponseEntity<ApiResource<Void>> tooLarge(AttachmentTooLargeException e) {
        return error(
                HttpStatus.PAYLOAD_TOO_LARGE, "ATTACHMENT_TOO_LARGE", e.getMessage(), List.of());
    }

    /**
     * Spec §6.3 — 415. The conclusion comes from the magic bytes, not from the Content-Type the
     * client sent.
     */
    @ExceptionHandler(UnsupportedImageTypeException.class)
    ResponseEntity<ApiResource<Void>> unsupportedType(UnsupportedImageTypeException e) {
        return error(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_IMAGE_TYPE",
                e.getMessage(),
                List.of());
    }

    /** ImageProbe throws this when the image is too large in pixels — 400 with the field name. */
    @ExceptionHandler(InvalidFieldException.class)
    ResponseEntity<ApiResource<Void>> invalidField(InvalidFieldException e) {
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(
                        FieldErrorResource.builder()
                                .field(e.getField())
                                .message(e.getMessage())
                                .build()));
    }

    /** Spec §8.3 — 403. The admin's boundary comes from a report, not from the role. */
    @ExceptionHandler(ModerationOutOfScopeException.class)
    ResponseEntity<ApiResource<Void>> outOfScope(ModerationOutOfScopeException e) {
        return error(HttpStatus.FORBIDDEN, "MODERATION_OUT_OF_SCOPE", e.getMessage(), List.of());
    }

    /** Spec §8.5 — 400. Reporting is for accusing others, not for removing your own message. */
    @ExceptionHandler(CannotReportOwnMessageException.class)
    ResponseEntity<ApiResource<Void>> ownMessage(CannotReportOwnMessageException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** uq_report_once — 409. */
    @ExceptionHandler(AlreadyReportedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReported(AlreadyReportedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REPORTED", e.getMessage(), List.of());
    }

    /**
     * Two requests open the same pair at the same moment → UNIQUE blocks one; the client calls
     * again and gets the thread.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> integrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_report_once")) {
            // Two report requests both get past existsBy...; UNIQUE blocks the second one
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REPORTED",
                    new AlreadyReportedException().getMessage(),
                    List.of());
        }
        if (cause.contains("uq_attach_message")) {
            // Two requests send the same image at the same moment; UNIQUE blocks the second one.
            // Same meaning as
            // the check in MessageService, so it returns the same code.
            return error(
                    HttpStatus.CONFLICT,
                    "ATTACHMENT_ALREADY_USED",
                    new AttachmentAlreadyUsedException().getMessage(),
                    List.of());
        }
        if (cause.contains("uq_conversation_pair")) {
            return error(
                    HttpStatus.CONFLICT,
                    "CONVERSATION_EXISTS",
                    "This conversation was just created. Please try again.",
                    List.of());
        }
        log.warn("Data integrity violation: {}", cause);
        return error(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                INVALID_MESSAGE,
                List.of(FieldErrorResource.builder().message(INVALID_MESSAGE).build()));
    }

    private static ResponseEntity<ApiResource<Void>> error(
            HttpStatus status, String code, String message, List<FieldErrorResource> details) {
        ErrorResource error = ErrorResource.builder().code(code).details(details).build();
        return ResponseEntity.status(status).body(ApiResource.error(error, message));
    }
}
