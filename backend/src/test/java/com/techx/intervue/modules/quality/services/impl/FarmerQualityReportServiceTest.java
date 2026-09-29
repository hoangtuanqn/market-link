package com.techx.intervue.modules.quality.services.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.enums.ApprovalStatus;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.enums.QualityReportStatus;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import com.techx.intervue.resources.PageResource;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

/** FR-122 (spec §4.4.2, §8): the stall's reports and its one editable reply. */
class FarmerQualityReportServiceTest {

    private static final long STALL_OWNER = 30L;
    private static final long FARMER_ID = 10L;
    private static final long REPORT = 9L;
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    /** CLOCK minus 90 days. */
    private static final Instant SINCE = Instant.parse("2026-07-08T03:00:00Z");

    private FarmerProfileRepository farmers;
    private QualityReportRepository reports;
    private QualityReportQueryRepository queries;
    private ShelfLifeStandingServiceInterface standing;
    private FarmerQualityReportService service;
    private QualityReport report;

    @BeforeEach
    void setUp() {
        farmers = mock(FarmerProfileRepository.class);
        reports = mock(QualityReportRepository.class);
        queries = mock(QualityReportQueryRepository.class);
        standing = mock(ShelfLifeStandingServiceInterface.class);
        service = new FarmerQualityReportService(farmers, reports, queries, standing, CLOCK);

        when(farmers.findByUserId(STALL_OWNER))
                .thenReturn(Optional.of(stall(ApprovalStatus.APPROVED)));
        report = new QualityReport();
        report.setId(REPORT);
        report.setFarmerId(FARMER_ID);
        when(reports.lockById(REPORT)).thenReturn(Optional.of(report));
        when(queries.findById(eq(REPORT), any())).thenReturn(Optional.of(row()));
    }

    private static FarmerProfile stall(ApprovalStatus status) {
        return FarmerProfile.builder()
                .id(FARMER_ID)
                .userId(STALL_OWNER)
                .stallName("Vườn Út Hiền")
                .contactPerson("Hiền")
                .approvalStatus(status)
                .build();
    }

    private static QualityReportResource row() {
        return new QualityReportResource(
                REPORT,
                21L,
                "ML-20260920-0007",
                FARMER_ID,
                "Vườn Út Hiền",
                "approved",
                "Nguyễn Văn An",
                3L,
                "Rau muống",
                "2026-10-03",
                "2026-10-07",
                "chilled",
                "2026-10-05",
                true,
                "mold",
                null,
                null,
                true,
                2,
                "open",
                "Khách để nhiệt độ thường.",
                Instant.parse("2026-10-06T03:00:00Z"),
                null,
                null,
                Instant.parse("2026-10-05T13:00:00Z"),
                1);
    }

    @Test
    void theStallSeesItsReportsAndItsStrikes() {
        PageResource<QualityReportResource> page = new PageResource<>(List.of(row()), 1, 20, 1);
        ShelfLifeStandingResource strikes = new ShelfLifeStandingResource(1, 3, 90, null);
        when(queries.forStall(FARMER_ID, SINCE, 0, 20)).thenReturn(page);
        when(standing.standing(FARMER_ID)).thenReturn(strikes);

        FarmerQualityReportsResource result = service.list(STALL_OWNER, 1, 20);

        assertThat(result.standing()).isEqualTo(strikes);
        assertThat(result.reports()).isEqualTo(page);
    }

    @Test
    void aReplyIsSavedWhileTheReportIsOpen() {
        QualityReportResource result =
                service.respond(STALL_OWNER, REPORT, "  Khách để nhiệt độ thường.  ");

        assertThat(report.getFarmerResponse()).isEqualTo("Khách để nhiệt độ thường.");
        assertThat(report.getFarmerRespondedAt()).isEqualTo(Instant.parse("2026-10-06T03:00:00Z"));
        verify(reports).saveAndFlush(report);
        assertThat(result.farmerResponse()).isEqualTo("Khách để nhiệt độ thường.");
    }

    /** Spec §8: a suspended stall can still answer a report. */
    @Test
    void aSuspendedStallCanStillReply() {
        when(farmers.findByUserId(STALL_OWNER))
                .thenReturn(Optional.of(stall(ApprovalStatus.SUSPENDED)));

        service.respond(STALL_OWNER, REPORT, "Hàng giao đúng hạn.");

        verify(reports).saveAndFlush(report);
    }

    /** R-06: another stall's report is a 403 even though it exists. */
    @Test
    void anotherStallsReportIs403() {
        report.setFarmerId(99L);

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(QualityReportNotYoursException.class);
        verify(reports, never()).saveAndFlush(any());
    }

    /** Review Focus #1: the reply can be edited until an admin decides, not after. */
    @Test
    void aDecidedReportCannotBeAnsweredAnyMore() {
        report.setStatus(QualityReportStatus.CONFIRMED);

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(ReportAlreadyDecidedException.class);
        verify(reports, never()).saveAndFlush(any());
    }

    @Test
    void aMissingReportIs404() {
        when(reports.lockById(REPORT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.respond(STALL_OWNER, REPORT, "x"))
                .isInstanceOf(QualityReportNotFoundException.class);
    }

    @Test
    void anAccountWithoutAStallIs403() {
        when(farmers.findByUserId(STALL_OWNER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.list(STALL_OWNER, 1, 20))
                .isInstanceOf(AccessDeniedException.class);
    }
}
