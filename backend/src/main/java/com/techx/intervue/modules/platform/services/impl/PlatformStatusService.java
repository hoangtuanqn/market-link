package com.techx.intervue.modules.platform.services.impl;

import com.techx.intervue.modules.platform.entities.PlatformStatus;
import com.techx.intervue.modules.platform.repositories.PlatformStatusRepository;
import com.techx.intervue.modules.platform.resources.PlatformStatusResource;
import com.techx.intervue.modules.platform.services.interfaces.PlatformStatusServiceInterface;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The single platform_status row (id = 1), seeded by its migration. */
@Service
@RequiredArgsConstructor
public class PlatformStatusService implements PlatformStatusServiceInterface {

    private static final int ROW_ID = 1;

    private final PlatformStatusRepository statuses;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public boolean isMaintenanceMode() {
        return row().isMaintenanceMode();
    }

    @Override
    @Transactional(readOnly = true)
    public PlatformStatusResource status() {
        return toResource(row());
    }

    @Override
    @Transactional
    public PlatformStatusResource setMaintenanceMode(boolean maintenanceMode, Long adminId) {
        PlatformStatus status = row();
        status.setMaintenanceMode(maintenanceMode);
        status.setUpdatedBy(adminId);
        status.setUpdatedAt(clock.instant());
        return toResource(status);
    }

    private PlatformStatus row() {
        return statuses.findById(ROW_ID)
                .orElseThrow(() -> new IllegalStateException("platform_status row is missing."));
    }

    private static PlatformStatusResource toResource(PlatformStatus status) {
        return new PlatformStatusResource(status.isMaintenanceMode());
    }
}
