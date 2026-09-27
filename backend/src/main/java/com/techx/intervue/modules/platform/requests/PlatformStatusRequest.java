package com.techx.intervue.modules.platform.requests;

import jakarta.validation.constraints.NotNull;

/** Turn maintenance mode on / off. */
public record PlatformStatusRequest(
        @NotNull(message = "State whether maintenance mode is on.") Boolean maintenanceMode) {}
