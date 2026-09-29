package com.techx.intervue.modules.catalog.resources;

public record CategoryResource(
        Long id,
        String name,
        String slug,
        int sortOrder,
        boolean isActive,
        int minShelfLifeDays,
        int maxShelfLifeDays,
        /**
         * Live (non-deleted) products pointing at this category. 0 on the public listing
         * (listActive).
         */
        int productCount) {}
