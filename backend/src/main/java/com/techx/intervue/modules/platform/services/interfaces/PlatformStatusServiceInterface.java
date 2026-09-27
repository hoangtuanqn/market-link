package com.techx.intervue.modules.platform.services.interfaces;

import com.techx.intervue.modules.platform.resources.PlatformStatusResource;

public interface PlatformStatusServiceInterface {

    /** Read on every request (MaintenanceModeFilter) — must stay cheap. */
    boolean isMaintenanceMode();

    PlatformStatusResource status();

    PlatformStatusResource setMaintenanceMode(boolean maintenanceMode, Long adminId);
}
