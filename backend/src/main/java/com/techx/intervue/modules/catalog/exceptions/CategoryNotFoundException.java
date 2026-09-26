package com.techx.intervue.modules.catalog.exceptions;

/** Admin gọi theo `{id}` danh mục không tồn tại → 404 (R-06). */
public class CategoryNotFoundException extends RuntimeException {
    public CategoryNotFoundException(long id) {
        super("Category not found.");
    }
}
