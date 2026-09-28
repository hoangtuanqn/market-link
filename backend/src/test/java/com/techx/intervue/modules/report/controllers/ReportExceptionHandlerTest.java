package com.techx.intervue.modules.report.controllers;

import static org.assertj.core.api.Assertions.assertThat;

import com.techx.intervue.modules.stall.exceptions.StallSuspendedException;
import com.techx.intervue.resources.ApiResource;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * FR-071 review finding: FarmerReportService.dashboard throws StallSuspendedException, but this
 * handler had no mapping for it — the request fell through to Spring's default 500 instead of the
 * 403 STALL_SUSPENDED envelope every other guarded endpoint returns.
 */
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
