package com.techx.intervue.modules.quality.exceptions;

import java.time.LocalDate;
import lombok.Getter;

@Getter
public class ShelfLifeExtensionLockedException extends RuntimeException {

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
