package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import java.util.List;

public interface ShelfLifeGuideServiceInterface {

    List<ShelfLifeGuideGroupResource> listForCategory(long categoryId, long viewerUserId);

    List<ShelfLifeGuideResource> adminList(long categoryId);

    ShelfLifeGuideResource create(ShelfLifeGuideRequest request);

    ShelfLifeGuideResource update(long id, ShelfLifeGuideRequest request);

    void deactivate(long id);
}
