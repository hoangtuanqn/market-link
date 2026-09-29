package com.techx.intervue.modules.favorite.services.interfaces;

import com.techx.intervue.modules.favorite.requests.FavoriteRequest;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import java.util.List;

public interface FavoriteServiceInterface {

    List<FavoriteResource> list(long userId, String targetType);

    FavoriteResource add(long userId, FavoriteRequest request);

    void remove(long userId, long favoriteId);
}
