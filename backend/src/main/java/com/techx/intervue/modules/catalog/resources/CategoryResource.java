package com.techx.intervue.modules.catalog.resources;

public record CategoryResource(
        Long id,
        String name,
        String slug,
        String description,
        String icon,
        int sortOrder,
        boolean isActive) {}
