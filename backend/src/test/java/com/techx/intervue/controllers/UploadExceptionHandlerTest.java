package com.techx.intervue.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class UploadExceptionHandlerTest {

    @Test
    void tooLargeSaysTheConfiguredLimit() {
        UploadExceptionHandler handler = new UploadExceptionHandler(DataSize.ofMegabytes(50));

        ResponseEntity<ApiResource<Void>> response =
                handler.tooLarge(new MaxUploadSizeExceededException(1));

        assertThat(response.getStatusCode().value()).isEqualTo(413);
        assertThat(response.getBody().getError().getCode()).isEqualTo("PAYLOAD_TOO_LARGE");
        assertThat(response.getBody().getError().getDetails().getFirst().getMessage())
                .isEqualTo("The file must be 50 MB or smaller.");
    }
}
