package com.techx.intervue.modules.catalog.exceptions;

public class DuplicateCategoryException extends RuntimeException {
    private final String slug;

    public DuplicateCategoryException(String slug) {
        super("A category with this name already exists.");
        this.slug = slug;
    }

    public String getSlug() {
        return slug;
    }
}
