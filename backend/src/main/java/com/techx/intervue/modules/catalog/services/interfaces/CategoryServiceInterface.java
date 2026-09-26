package com.techx.intervue.modules.catalog.services.interfaces;

import com.techx.intervue.modules.catalog.requests.CategoryRequest;
import com.techx.intervue.modules.catalog.resources.CategoryResource;
import java.util.List;

public interface CategoryServiceInterface {
    /** Public — chỉ danh mục đang bật, theo sort_order rồi tên (FR-020). */
    List<CategoryResource> listActive();

    /** Admin — cả danh mục đã tắt, để bật lại được (FR-076). */
    List<CategoryResource> listAll();

    CategoryResource create(CategoryRequest request);

    CategoryResource update(long id, CategoryRequest request);

    /** Xoá mềm: is_active = false. Không xoá dòng vì products.category_id trỏ vào đây. */
    void deactivate(long id);
}
