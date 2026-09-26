package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import java.util.List;

public interface CategoryServiceInterface {
    /** Public — only active categories, by sort_order then name (FR-020). */
    List<CategoryResource> listActive();

    /** Admin — including disabled categories, so they can be turned back on (FR-076). */
    List<CategoryResource> listAll();

    CategoryResource create(CategoryRequest request);

    CategoryResource update(long id, CategoryRequest request);

    /**
     * Soft delete: is_active = false. The row is not deleted because products.category_id points to
     * it.
     */
    void deactivate(long id);
}
