package com.techx.intervue.modules.catalog.exceptions;

/** Two different names can produce the same slug ("Rau củ" and "Rau cu") → 409, not 400. */
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
