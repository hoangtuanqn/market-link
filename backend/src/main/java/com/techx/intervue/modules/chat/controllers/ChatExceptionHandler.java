package com.techx.intervue.modules.chat.controllers;

import com.techx.intervue.resources.ApiResource;
import com.techx.intervue.resources.ErrorResource;
import com.techx.intervue.resources.FieldErrorResource;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/**
 * Returns 400 for bad chatbot requests. Applies only to ChatController — the repo has no shared
 * handler yet, so validation errors fall through to /error (not public) and come back as 401.
 */
@RestControllerAdvice(assignableTypes = ChatController.class)
public class ChatExceptionHandler {

    private static final String MESSAGE = "Some of the information you sent is not valid.";

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
        return badRequest(details);
    }

    @ExceptionHandler({
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        MissingServletRequestParameterException.class,
        HttpMessageNotReadableException.class
    })
    ResponseEntity<ApiResource<Void>> invalidRequest(Exception e) {
        return badRequest(List.of(FieldErrorResource.builder().message(MESSAGE).build()));
    }

    private static ResponseEntity<ApiResource<Void>> badRequest(List<FieldErrorResource> details) {
        ErrorResource error =
                ErrorResource.builder().code("VALIDATION_ERROR").details(details).build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResource.error(error, MESSAGE));
    }
}
