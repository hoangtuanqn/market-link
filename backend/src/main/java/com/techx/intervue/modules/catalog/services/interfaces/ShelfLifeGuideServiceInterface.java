package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import java.util.List;

/** FR-120: shelf-life guides — suggestions for the product form, master data for the admin. */
public interface ShelfLifeGuideServiceInterface {

    /**
     * The active groups of one category, with what other stalls set. {@code viewerUserId} is the
     * signed-in user: the products of their own stall are left out of the numbers; an admin has no
     * stall, so every stall counts.
     */
    List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, long viewerUserId);

    /** Every row of a category, turned-off ones included (admin). */
    List<ShelfLifeGuideResource> adminList(long categoryId);

    /**
     * 404 CATEGORY_NOT_FOUND for an unknown category; 409 when the group already has that mode. A
     * name that matches a group of the category when case and accents are ignored takes that
     * group's spelling, so the form shows one group, not two.
     */
    ShelfLifeGuideResource create(ShelfLifeGuideRequest request);

    /**
     * 404 SHELF_LIFE_GUIDE_NOT_FOUND; 400 on {@code categoryId} or {@code storageMode} when the
     * request changes them (a group never moves, see the implementation); 409 when the new name
     * already has that mode.
     */
    ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request);

    /** Soft delete: products that use it keep their saved numbers. */
    void deactivate(long id);
}
