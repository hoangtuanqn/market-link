package com.techx.intervue.modules.catalog.exceptions;

/** An admin calls with the `{id}` of a category that does not exist → 404 (R-06). */
public class CategoryNotFoundException extends RuntimeException {
    public CategoryNotFoundException(long id) {
        super("Category not found.");
    }
}
