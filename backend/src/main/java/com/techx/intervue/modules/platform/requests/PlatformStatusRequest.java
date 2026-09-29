package com.techx.intervue.modules.platform.requests;

import jakarta.validation.constraints.NotNull;

public record PlatformStatusRequest(
        @NotNull(message = "State whether maintenance mode is on.") Boolean maintenanceMode) {}
