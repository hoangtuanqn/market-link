package com.techx.intervue.modules.quality.resources;

import java.time.Instant;

/**
 * FR-123 (spec §4.4.4): the stall's strikes of the last {@code windowDays} days; from {@code limit}
 * strikes {@code extensionLockedUntil} says when the lock on longer shelf lives ends, null
 * otherwise.
 */
public record ShelfLifeStandingResource(
        int activeViolations, int limit, int windowDays, Instant extensionLockedUntil) {}
