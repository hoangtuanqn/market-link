package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import java.util.List;

/** FR-120: shelf-life guides — suggestions for the product form, master data for the admin. */
public interface ShelfLifeGuideServiceInterface {

    /**
     * The active groups of one category, with what other stalls set. {@code viewerFarmerId} is the
     * asking stall, left out of the numbers; null for an admin.
     */
    List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, Long viewerFarmerId);

    /** Every row of a category, turned-off ones included (admin). */
    List<ShelfLifeGuideResource> adminList(long categoryId);

    /** 404 CATEGORY_NOT_FOUND for an unknown category; 409 when the group already has that mode. */
    ShelfLifeGuideResource create(ShelfLifeGuideRequest request);

    ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request);

    /** Soft delete: products that use it keep their saved numbers. */
    void deactivate(long id);
}
