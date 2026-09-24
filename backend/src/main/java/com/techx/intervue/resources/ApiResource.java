package com.techx.intervue.resources;

import java.time.Instant;
import lombok.Builder;
import lombok.Getter;
import org.slf4j.MDC;

@Getter
@Builder
public class ApiResource<T> {
    private boolean success;
    private String message;
    private T data;
    private ErrorResource error;
    private String traceId;
    private Instant timestamp;

    public static <T> ApiResource<T> success(T data, String message) {
        return ApiResource.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .traceId(MDC.get("traceId"))
                .timestamp(Instant.now())
                .build();
    }

    public static <T> ApiResource<T> error(ErrorResource error, String message) {
        return ApiResource.<T>builder()
                .success(false)
                .message(message)
                .error(error)
                .traceId(MDC.get("traceId"))
                .timestamp(Instant.now())
                .build();
    }
}
