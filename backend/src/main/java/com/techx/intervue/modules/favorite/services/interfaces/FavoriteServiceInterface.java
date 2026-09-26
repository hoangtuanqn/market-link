package com.techx.intervue.modules.favorite.services.interfaces;

import com.techx.intervue.modules.favorite.requests.FavoriteRequest;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import java.util.List;

/** FR-040, FR-014 — favourites of the signed-in customer or farmer (contract §9). */
public interface FavoriteServiceInterface {

    List<FavoriteResource> list(long userId, String targetType);

    FavoriteResource add(long userId, FavoriteRequest request);

    void remove(long userId, long favoriteId);
}
