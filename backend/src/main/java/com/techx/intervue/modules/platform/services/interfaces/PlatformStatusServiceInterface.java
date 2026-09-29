package com.techx.intervue.modules.platform.services.interfaces;

import com.techx.intervue.modules.platform.resources.PlatformStatusResource;

public interface PlatformStatusServiceInterface {

    boolean isMaintenanceMode();

    PlatformStatusResource status();

    PlatformStatusResource setMaintenanceMode(boolean maintenanceMode, Long adminId);
}
