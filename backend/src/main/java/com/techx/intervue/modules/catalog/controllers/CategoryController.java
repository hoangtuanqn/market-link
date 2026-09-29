package com.techx.intervue.modules.catalog.controllers;

import com.techx.intervue.controllers.BaseController;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import com.techx.intervue.modules.catalog.services.interfaces.CategoryServiceInterface;
import com.techx.intervue.resources.ApiResource;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
@AllArgsConstructor
public class CategoryController extends BaseController {

    private final CategoryServiceInterface categoryService;

    @GetMapping
    public ResponseEntity<ApiResource<List<CategoryResource>>> list() {
        return ok(categoryService.listActive(), "");
    }
}
