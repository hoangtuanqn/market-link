package com.techx.intervue.controllers;

import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/**
 * A file over spring.servlet.multipart.max-file-size is rejected while reading the body, before it
 * is known which controller receives it, so a per-controller handler (AuthExceptionHandler) cannot
 * catch it — this class is a shared handler.
 */
@RestControllerAdvice
public class UploadExceptionHandler {

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiResource<Void>> tooLarge(MaxUploadSizeExceededException e) {
        ErrorResource error =
                ErrorResource.builder()
                        .code("PAYLOAD_TOO_LARGE")
                        .details(
                                List.of(
                                        FieldErrorResource.builder()
                                                .field("file")
                                                .message("The file must be 40 MB or smaller.")
                                                .build()))
                        .build();
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
                .body(ApiResource.error(error, "The file is too large."));
    }
}
