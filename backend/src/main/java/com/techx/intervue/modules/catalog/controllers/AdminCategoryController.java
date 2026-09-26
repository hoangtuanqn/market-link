package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import com.techx.intervue.modules.catalog.services.interfaces.CategoryServiceInterface;
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
import org.springframework.web.bind.annotation.RestController;

/** FR-076 — master data. Admin only (the role comes from the token, R-06). */
@RestController
@RequestMapping("/api/v1/admin/categories")
@PreAuthorize("hasRole('ADMIN')")
@AllArgsConstructor
public class AdminCategoryController extends BaseController {

    private final CategoryServiceInterface categoryService;

    @GetMapping
    public ResponseEntity<ApiResource<List<CategoryResource>>> list() {
        return ok(categoryService.listAll(), "");
    }

    @PostMapping
    public ResponseEntity<ApiResource<CategoryResource>> create(
            @Valid @RequestBody CategoryRequest request) {
        return created(categoryService.create(request), "Category added.");
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResource<CategoryResource>> update(
            @PathVariable long id, @Valid @RequestBody CategoryRequest request) {
        return ok(categoryService.update(id, request), "Category saved.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResource<Void>> deactivate(@PathVariable long id) {
        categoryService.deactivate(id);
        return ok(null, "Category turned off.");
    }
}
