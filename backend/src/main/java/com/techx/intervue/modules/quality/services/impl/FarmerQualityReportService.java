package com.techx.intervue.modules.quality.services.impl;

import com.techx.intervue.modules.farmer.entities.FarmerProfile;
import com.techx.intervue.modules.farmer.repositories.FarmerProfileRepository;
import com.techx.intervue.modules.quality.entities.QualityReport;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotFoundException;
import com.techx.intervue.modules.quality.exceptions.QualityReportNotYoursException;
import com.techx.intervue.modules.quality.exceptions.ReportAlreadyDecidedException;
import com.techx.intervue.modules.quality.repositories.QualityReportQueryRepository;
import com.techx.intervue.modules.quality.repositories.QualityReportRepository;
import com.techx.intervue.modules.quality.resources.FarmerQualityReportsResource;
import com.techx.intervue.modules.quality.resources.QualityReportResource;
import com.techx.intervue.modules.quality.services.interfaces.FarmerQualityReportServiceInterface;
import com.techx.intervue.modules.quality.services.interfaces.ShelfLifeStandingServiceInterface;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import lombok.AllArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * FR-122 (spec §4.4.2): the stall reads the reports about it and keeps one reply per report,
 * editable until an admin decides. A suspended stall may still reply (spec §8), so there is no
 * approval check here.
 */
@Service
@AllArgsConstructor
public class FarmerQualityReportService implements FarmerQualityReportServiceInterface {

    private static final int MAX_PAGE_SIZE = 50;

    private final FarmerProfileRepository farmers;
    private final QualityReportRepository reports;
    private final QualityReportQueryRepository queries;
    private final ShelfLifeStandingServiceInterface standing;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public FarmerQualityReportsResource list(long farmerUserId, int page, int pageSize) {
        FarmerProfile stall = stallOf(farmerUserId);
        int safePage = Math.max(1, page);
        int safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return new FarmerQualityReportsResource(
                standing.standing(stall.getId()),
                queries.forStall(
                        stall.getId(),
                        SpoilagePolicy.strikeWindowStart(clock.instant()),
                        (safePage - 1) * safeSize,
                        safeSize));
    }

    @Override
    @Transactional
    public QualityReportResource respond(long farmerUserId, long reportId, String response) {
        FarmerProfile stall = stallOf(farmerUserId);
        // Locked: an admin deciding at the same moment either sees this reply or refuses it
        QualityReport report =
                reports.lockById(reportId).orElseThrow(QualityReportNotFoundException::new);
        if (!Objects.equals(report.getFarmerId(), stall.getId())) {
            throw new QualityReportNotYoursException();
        }
        if (!report.isOpen()) {
            throw new ReportAlreadyDecidedException();
        }
        Instant now = clock.instant();
        report.setFarmerResponse(response.trim());
        report.setFarmerRespondedAt(now);
        reports.saveAndFlush(report);
        return queries.findById(reportId, SpoilagePolicy.strikeWindowStart(now))
                .orElseThrow(QualityReportNotFoundException::new);
    }

    /** R-06: the stall always comes from the caller's own account, never from the request. */
    private FarmerProfile stallOf(long farmerUserId) {
        return farmers.findByUserId(farmerUserId)
                .orElseThrow(() -> new AccessDeniedException("No stall for this account."));
    }
}
