package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideGroupResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import com.techx.intervue.modules.user.resources.CustomUserDetails;
import com.techx.intervue.resources.ApiResource;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/shelf-life-guides")
@PreAuthorize("hasAnyRole('FARMER','ADMIN')")
@AllArgsConstructor
public class ShelfLifeGuideController extends BaseController {

    private final ShelfLifeGuideServiceInterface guides;

    @GetMapping
    public ResponseEntity<ApiResource<List<ShelfLifeGuideGroupResource>>> list(
            @RequestParam long categoryId, @AuthenticationPrincipal CustomUserDetails user) {
        return ok(guides.listForCategory(categoryId, user.getId()), "");
    }
}
