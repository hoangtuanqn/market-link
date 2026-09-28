package com.techx.intervue.modules.catalog.exceptions;

public class ShelfLifeGuideNotFoundException extends RuntimeException {
    public ShelfLifeGuideNotFoundException(long id) {
        super("Shelf-life group " + id + " not found.");
    }
}
