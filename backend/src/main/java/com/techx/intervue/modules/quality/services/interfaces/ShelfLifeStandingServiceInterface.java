package com.techx.intervue.modules.quality.services.interfaces;

import com.techx.intervue.modules.quality.resources.ShelfLifeStandingResource;

public interface ShelfLifeStandingServiceInterface {

    ShelfLifeStandingResource standing(long farmerId);

    void requireCanExtend(long farmerId);
}
