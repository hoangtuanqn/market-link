package com.techx.intervue.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.catalog.controllers.CatalogExceptionHandler;
import com.techx.intervue.modules.farmer.controllers.FarmerExceptionHandler;
import com.techx.intervue.modules.product.controllers.ProductExceptionHandler;
import com.techx.intervue.modules.stall.controllers.StallExceptionHandler;
import com.techx.intervue.resources.ApiResource;
import java.lang.reflect.Method;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.web.bind.annotation.ExceptionHandler;

/**
 * QA E2E v2 BUG-002: POST /farmer/apply with no body (and the same on categories, markets, stall
 * and product routes) fell through to /error. Each of these module handlers must answer the
 * standard 400 envelope itself.
 */
class UnreadableBodyHandlerTest {

    static Stream<Object> handlers() {
        return Stream.of(
                new FarmerExceptionHandler(),
                new CatalogExceptionHandler(),
                new StallExceptionHandler(),
                new ProductExceptionHandler());
    }

    @ParameterizedTest
    @MethodSource("handlers")
    void unreadableBodyIsA400ValidationError(Object handler) throws Exception {
        Method method = handlerFor(handler.getClass());
        method.setAccessible(true);
        HttpMessageNotReadableException missingBody =
                new HttpMessageNotReadableException(
                        "Required request body is missing", new MockHttpInputMessage(new byte[0]));

        @SuppressWarnings("unchecked")
        ResponseEntity<ApiResource<Void>> response =
                (ResponseEntity<ApiResource<Void>>) method.invoke(handler, missingBody);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getError().getCode()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().getMessage()).doesNotContain("Required request body");
    }

    private static Method handlerFor(Class<?> type) {
        return Stream.of(type.getDeclaredMethods())
                .filter(
                        m -> {
                            ExceptionHandler annotation = m.getAnnotation(ExceptionHandler.class);
                            return annotation != null
                                    && Stream.of(annotation.value())
                                            .anyMatch(
                                                    HttpMessageNotReadableException.class::equals);
                        })
                .findFirst()
                .orElseThrow(
                        () ->
                                new AssertionError(
                                        type.getSimpleName()
                                                + " has no HttpMessageNotReadableException handler"));
    }
}
