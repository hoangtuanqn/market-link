package com.techx.intervue.modules.catalog.resources;

public record ShelfLifeGuideResource(
        Long id,
        Long categoryId,
        String groupName,
        String examples,
        String storageMode,
        int suggestedDays,
        boolean isActive) {}
