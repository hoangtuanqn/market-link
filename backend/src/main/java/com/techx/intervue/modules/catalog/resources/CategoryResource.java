package com.techx.intervue.modules.catalog.resources;

public record CategoryResource(
        Long id,
        String name,
        String slug,
        int sortOrder,
        boolean isActive,
        int minShelfLifeDays,
        int maxShelfLifeDays) {}
