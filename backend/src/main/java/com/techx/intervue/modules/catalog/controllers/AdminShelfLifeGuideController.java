package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.requests.ShelfLifeGuideRequest;
import com.techx.intervue.modules.catalog.resources.ShelfLifeGuideResource;
import com.techx.intervue.modules.catalog.services.interfaces.ShelfLifeGuideServiceInterface;
import com.techx.intervue.resources.ApiResource;
import jakarta.validation.Valid;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/shelf-life-guides")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminShelfLifeGuideController extends BaseController {

    private final ShelfLifeGuideServiceInterface guides;

    @GetMapping
    public ResponseEntity<ApiResource<List<ShelfLifeGuideResource>>> list(
            @RequestParam long categoryId) {
        return ok(guides.adminList(categoryId), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<ShelfLifeGuideResource>> create(
            @Valid @RequestBody ShelfLifeGuideRequest request) {
        return created(guides.create(request), "Group added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<ShelfLifeGuideResource>> update(
            @PathVariable long id, @Valid @RequestBody ShelfLifeGuideRequest request) {
        return ok(guides.update(id, request), "Group saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> deactivate(@PathVariable long id) {
        guides.deactivate(id);
        return ok(null, "Group turned off.");
    }
}
