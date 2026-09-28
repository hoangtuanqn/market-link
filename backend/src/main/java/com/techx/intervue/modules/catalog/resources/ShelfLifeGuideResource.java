package com.techx.intervue.modules.catalog.resources;

/** FR-120: one guide row as the admin manages it (contract §5). */
public record ShelfLifeGuideResource(
        Long id,
        Long categoryId,
        String groupName,
        String examples,
        String storageMode,
        int suggestedDays,
        boolean isActive) {}
