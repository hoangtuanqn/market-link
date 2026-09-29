package com.techx.intervue.modules.product.resources;

public record ShelfLifeResource(
        Long guideId,
        String groupName,
        String storageMode,
        int days,
        Integer suggestedDays,
        boolean extended) {}
