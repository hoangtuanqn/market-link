package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;
import lombok.Getter;

/**
 * FR-123 (spec §4.2, §4.4.4): the stall has 3 shelf-life strikes in 90 days, so a shelf life longer
 * than the suggestion is refused — 409 SHELF_LIFE_EXTENSION_LOCKED on {@code shelfLifeDays}.
 */
@Getter
public class ShelfLifeExtensionLockedException extends RuntimeException {

    /** The Ho Chi Minh City day the lock ends. */
    private final LocalDate lockedUntil;

    public ShelfLifeExtensionLockedException(LocalDate lockedUntil) {
        super(
                "Your stall has 3 shelf-life strikes in 90 days, so it cannot set a shelf life"
                        + " longer than suggested until "
                        + lockedUntil
                        + ".");
        this.lockedUntil = lockedUntil;
    }
}
