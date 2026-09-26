package com.techx.intervue.modules.favorite.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.favorite.requests.FavoriteRequest;
import com.techx.intervue.modules.favorite.resources.FavoriteResource;
import com.techx.intervue.modules.favorite.services.interfaces.FavoriteServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-040, FR-014 — favourites (contract §9). Customers and farmers (D-13: a farmer also buys);
 * admin accounts get 403 here and again in the service.
 */
@RestController
@RequestMapping("/api/v1/favorites")
@PreAuthorize("hasAnyRole('CUSTOMER','FARMER')")
@AllArgsConstructor
public class FavoriteController extends BaseController {

    private final FavoriteServiceInterface favorites;

    @GetMapping
    public ResponseEntity<ApiResource<List<FavoriteResource>>> list(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(required = false) String targetType) {
        return ok(favorites.list(user.getId(), targetType), "");
    }

    /** Idempotent: adding the same target again returns the existing favourite (200). */
    @PostMapping
    public ResponseEntity<ApiResource<FavoriteResource>> add(
            @AuthenticationPrincipal CustomUserDetails user,
            @Valid @RequestBody FavoriteRequest request) {
        return ok(favorites.add(user.getId(), request), "Added to favourites.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> remove(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable long id) {
        favorites.remove(user.getId(), id);
        return ok(null, "Removed from favourites.");
    }
}
