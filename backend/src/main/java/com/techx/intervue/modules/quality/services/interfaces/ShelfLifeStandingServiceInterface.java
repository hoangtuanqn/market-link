package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;

public interface ShelfLifeStandingServiceInterface {

    /** FR-123 (spec §4.4.4): strikes of the last 90 days and, from 3, when the lock ends. */
    ShelfLifeStandingResource standing(long farmerId);

    /**
     * FR-123 (spec §4.2): refuses a shelf life longer than the suggestion while the stall is
     * locked; does nothing otherwise.
     */
    void requireCanExtend(long farmerId);
}
