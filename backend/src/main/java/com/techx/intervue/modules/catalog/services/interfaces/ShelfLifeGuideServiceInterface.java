package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import java.util.List;

/** FR-120: shelf-life guides — suggestions for the product form, master data for the admin. */
public interface ShelfLifeGuideServiceInterface {

    /**
     * The active groups of one category, with what other stalls set. {@code viewerFarmerId} is the
     * asking stall, left out of the numbers; null for an admin.
     */
    List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, Long viewerFarmerId);
}
