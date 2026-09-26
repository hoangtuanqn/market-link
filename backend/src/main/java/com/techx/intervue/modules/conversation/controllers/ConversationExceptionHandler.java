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
 * Mã HTTP theo spec mục 6.3, cho các controller của module chat. Lỗi multipart quá cỡ do
 * UploadExceptionHandler TOÀN CỤC xử lý (Tomcat chặn khi đọc body, trước khi biết controller nào
 * nhận), nên đừng thêm lại ở đây: hai advice cùng bắt một exception mà không cái nào khai @Order
 * thì error.code trả về là không xác định.
 *
 * <p>Thêm controller mới vào module thì phải thêm vào assignableTypes dưới đây, nếu không mọi
 * exception của nó thành 500 — ConversationExceptionHandlerScopeTest ghim điều đó.
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

    /** R-06: sai chủ sở hữu → 403, không phải 404, để FE hiện đúng lý do. */
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

    /** D-09: thread cũ đọc được, gửi thêm thì 409 kèm lý do bằng chữ. */
    @ExceptionHandler(ConversationClosedException.class)
    ResponseEntity<ApiResource<Void>> closed(ConversationClosedException e) {
        return error(HttpStatus.CONFLICT, "CONVERSATION_CLOSED", e.getMessage(), List.of());
    }

    /** Spec §8.4 — vượt hạn mức. Lý do viết thẳng bằng chữ để FE hiện nguyên câu. */
    @ExceptionHandler(RateLimitedException.class)
    ResponseEntity<ApiResource<Void>> tooManyRequests(RateLimitedException e) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", e.getMessage(), List.of());
    }

    /** R-06: ảnh của người khác → 403, không phải 404. */
    @ExceptionHandler(AttachmentNotYoursException.class)
    ResponseEntity<ApiResource<Void>> notYourAttachment(AttachmentNotYoursException e) {
        return error(HttpStatus.FORBIDDEN, "ATTACHMENT_NOT_YOURS", e.getMessage(), List.of());
    }

    /** Một ảnh chỉ gắn vào đúng một tin → 409. */
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

    /** Spec §6.3 — 415. Kết luận từ magic bytes, không từ Content-Type client gửi. */
    @ExceptionHandler(UnsupportedImageTypeException.class)
    ResponseEntity<ApiResource<Void>> unsupportedType(UnsupportedImageTypeException e) {
        return error(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_IMAGE_TYPE",
                e.getMessage(),
                List.of());
    }

    /** ImageProbe ném cái này khi ảnh quá lớn về số điểm ảnh — 400 kèm tên trường. */
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

    /** Spec §8.3 — 403. Ranh giới của admin bắt nguồn từ báo cáo, không từ vai. */
    @ExceptionHandler(ModerationOutOfScopeException.class)
    ResponseEntity<ApiResource<Void>> outOfScope(ModerationOutOfScopeException e) {
        return error(HttpStatus.FORBIDDEN, "MODERATION_OUT_OF_SCOPE", e.getMessage(), List.of());
    }

    /** Spec §8.5 — 400. Báo cáo là để tố người khác, không phải để tự gỡ tin của mình. */
    @ExceptionHandler(CannotReportOwnMessageException.class)
    ResponseEntity<ApiResource<Void>> ownMessage(CannotReportOwnMessageException e) {
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(), List.of());
    }

    /** uq_report_once — 409. */
    @ExceptionHandler(AlreadyReportedException.class)
    ResponseEntity<ApiResource<Void>> alreadyReported(AlreadyReportedException e) {
        return error(HttpStatus.CONFLICT, "ALREADY_REPORTED", e.getMessage(), List.of());
    }

    /** Hai request mở cùng một cặp đúng lúc → UNIQUE chặn một cái; client gọi lại là có thread. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiResource<Void>> integrity(DataIntegrityViolationException e) {
        String cause = String.valueOf(e.getMostSpecificCause().getMessage());
        if (cause.contains("uq_report_once")) {
            // Hai request báo cáo cùng lúc lọt qua existsBy...; UNIQUE chặn cái thứ hai
            return error(
                    HttpStatus.CONFLICT,
                    "ALREADY_REPORTED",
                    new AlreadyReportedException().getMessage(),
                    List.of());
        }
        if (cause.contains("uq_attach_message")) {
            // Hai request gửi cùng một ảnh cùng lúc; UNIQUE chặn cái thứ hai. Cùng ý nghĩa với
            // kiểm tra trong MessageService nên trả cùng mã.
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
