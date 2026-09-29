package com.techx.intervue.modules.catalog.exceptions;

public class CategoryNotFoundException extends RuntimeException {
    public CategoryNotFoundException(long id) {
        super("Category not found.");
    }
}
