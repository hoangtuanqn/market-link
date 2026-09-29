package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

public record ShelfLifeStandingResource(
        int activeViolations, int limit, int windowDays, Instant extensionLockedUntil) {}
