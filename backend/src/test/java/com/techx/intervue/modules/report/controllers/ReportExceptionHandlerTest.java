package com.techx.intervue.modules.report.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ReportExceptionHandlerTest {

    private final ReportExceptionHandler handler = new ReportExceptionHandler();

    @Test
    void aSuspendedStallReadingTheDashboardGets403NotAServerError() {
        ResponseEntity<ApiResource<Void>> response =
                handler.suspended(
                        new StallSuspendedException("Suspended. Reason: Missed pickups."));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().getError().getCode()).isEqualTo("STALL_SUSPENDED");
        assertThat(response.getBody().getMessage()).isEqualTo("Suspended. Reason: Missed pickups.");
    }
}
