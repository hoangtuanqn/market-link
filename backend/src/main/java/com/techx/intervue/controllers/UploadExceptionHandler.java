package com.techx.intervue.controllers;

import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class UploadExceptionHandler {

    private final DataSize maxFileSize;

    public UploadExceptionHandler(
            @Value("${spring.servlet.multipart.max-file-size}") DataSize maxFileSize) {
        this.maxFileSize = maxFileSize;
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ApiResource<Void>> tooLarge(MaxUploadSizeExceededException e) {
        ErrorResource error =
                ErrorResource.builder()
                        .code("PAYLOAD_TOO_LARGE")
                        .details(
                                List.of(
                                        FieldErrorResource.builder()
                                                .field("file")
                                                .message(
                                                        "The file must be "
                                                                + maxFileSize.toMegabytes()
                                                                + " MB or smaller.")
                                                .build()))
                        .build();
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
                .body(ApiResource.error(error, "The file is too large."));
    }
}
