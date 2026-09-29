package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import java.util.List;

public interface CategoryServiceInterface {
    List<CategoryResource> listActive();

    List<CategoryResource> listAll();

    CategoryResource create(CategoryRequest request);

    CategoryResource update(long id, CategoryRequest request);

    void deactivate(long id, Long moveToCategoryId);

    CategoryResource activate(long id);
}
