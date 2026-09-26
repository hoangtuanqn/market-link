package com.techx.intervue.modules.catalog.exceptions;

/** Hai tên khác nhau có thể cho cùng slug ("Rau củ" và "Rau cu") → 409, không phải 400. */
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
